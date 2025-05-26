document.addEventListener('DOMContentLoaded', () => {
    // (変更なし：Navigation, Section, Data Import, Flashcard, Word List, Edit Modal Elements)
    // ... (前回の宣言部分をそのまま使用) ...
    const navToFlashcardButton = document.getElementById('nav-to-flashcard');
    const navToImportButton = document.getElementById('nav-to-import');
    const navToListButton = document.getElementById('nav-to-list');
    const navButtons = [navToFlashcardButton, navToImportButton, navToListButton];

    const dataImportSection = document.getElementById('data-import-section');
    const flashcardSection = document.getElementById('flashcard-section');
    const wordListSection = document.getElementById('word-list-section');
    const allSections = [dataImportSection, flashcardSection, wordListSection];

    const csvInput = document.getElementById('csv-input');
    const importCsvButton = document.getElementById('import-csv-button');
    const clearAllDataButton = document.getElementById('clear-all-data-button');

    const cardSurface = document.getElementById('card-surface');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');
    const editWordButton = document.getElementById('edit-word-button');
    const deleteWordButton = document.getElementById('delete-word-button');
    const cardCountDisplay = document.getElementById('card-count');

    const wordListTbody = document.getElementById('word-list-tbody');
    const backToFlashcardFromListButton = document.getElementById('back-to-flashcard-from-list');

    const editModal = document.getElementById('edit-modal');
    const closeModalButton = document.querySelector('.close-button');
    const saveEditButton = document.getElementById('save-edit-button');
    const editWordIndexInput = document.getElementById('edit-word-index');
    const editCategoryInput = document.getElementById('edit-category');
    const editChineseInput = document.getElementById('edit-chinese');
    const editPinyinInput = document.getElementById('edit-pinyin');
    const editJapaneseInput = document.getElementById('edit-japanese');


    const localStorageKey = 'chineseLearningAppWords';
    let words = [];
    let currentWordIndex = 0;
    let isCardShowingFront = true;

    let chineseVoice = null; // 中国語音声用

    // --- Speech Synthesis Voice Setup ---
    function findChineseVoice() {
        if (!('speechSynthesis' in window)) return;
        const voices = speechSynthesis.getVoices();
        chineseVoice = voices.find(voice => voice.lang === 'zh-CN');
        if (!chineseVoice) {
            chineseVoice = voices.find(voice => voice.lang.startsWith('zh-'));
        }
        // console.log("Selected Chinese voice:", chineseVoice ? chineseVoice.name : "Not found");
    }

    if ('speechSynthesis' in window) {
        // 初回ロード時と音声リスト変更時に中国語音声を探す
        findChineseVoice();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = findChineseVoice;
        }
    }


    // --- Navigation and Section Management ---
    // ... (変更なし: showSection, navToFlashcardButton, navToImportButton, navToListButton, backToFlashcardFromListButton listeners) ...
    function showSection(sectionToShow) {
        allSections.forEach(section => {
            if (section.id === sectionToShow) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
        navButtons.forEach(button => {
            if (button.id === `nav-to-${sectionToShow.replace('-section', '')}`) {
                button.classList.add('active-nav');
            } else {
                button.classList.remove('active-nav');
            }
        });
    }

    navToFlashcardButton.addEventListener('click', () => {
        showSection('flashcard-section');
        updateFlashcardDisplay();
    });

    navToImportButton.addEventListener('click', () => {
        showSection('data-import-section');
    });

    navToListButton.addEventListener('click', () => {
        showSection('word-list-section');
        updateWordListDisplay();
    });

    backToFlashcardFromListButton.addEventListener('click', () => {
        showSection('flashcard-section');
        updateFlashcardDisplay();
    });

    // --- データ管理 ---
    // ... (変更なし: loadWords, saveWords, importCsvButton listener, clearAllDataButton listener) ...
    function loadWords() {
        const storedWords = localStorage.getItem(localStorageKey);
        if (storedWords) {
            words = JSON.parse(storedWords);
        } else {
            words = [];
        }
        currentWordIndex = 0;
        isCardShowingFront = true;
        updateFlashcardDisplay();
        updateActionButtonsState();
    }

    function saveWords() {
        localStorage.setItem(localStorageKey, JSON.stringify(words));
    }

    importCsvButton.addEventListener('click', () => {
        const csvText = csvInput.value.trim();
        if (!csvText) {
            alert('登録するデータを入力してください。');
            return;
        }
        try {
            const newWords = csvText.split('\n').map(line => {
                const parts = line.split(',');
                if (parts.length !== 4) throw new Error('CSVの形式が正しくありません。各行は「区分,中国語,ピンイン,日本語訳」である必要があります。');
                return {
                    category: parts[0].trim(),
                    chinese: parts[1].trim(),
                    pinyin: parts[2].trim(),
                    japanese: parts[3].trim()
                };
            });
            words = words.concat(newWords);
            saveWords();
            csvInput.value = '';
            alert(`${newWords.length}件の単語を登録しました。フラッシュカード画面に移動します。`);
            loadWords();
            showSection('flashcard-section');
        } catch (error) {
            alert(`エラー: ${error.message}`);
        }
    });

    clearAllDataButton.addEventListener('click', () => {
        if (confirm('本当にすべての単語データを削除しますか？この操作は元に戻せません。')) {
            words = [];
            saveWords();
            loadWords();
            alert('すべての単語データを削除しました。');
            if (!dataImportSection.classList.contains('hidden')) {
                // Stay on import section
            } else {
                showSection('flashcard-section');
            }
        }
    });

    // --- フラッシュカード機能 ---
    function updateFlashcardDisplay() {
        if (words.length === 0) {
            cardSurface.innerHTML = '登録されている単語がありません。<br>「単語登録」からデータを登録してください。';
            cardCountDisplay.textContent = '0 / 0';
            updateActionButtonsState();
            return;
        }

        if (currentWordIndex >= words.length) currentWordIndex = 0;
        if (currentWordIndex < 0 && words.length > 0) currentWordIndex = words.length - 1;
        if (words.length === 0) { // Should be caught by the first if, but as a safeguard
            cardSurface.innerHTML = '登録されている単語がありません。<br>「単語登録」からデータを登録してください。';
            cardCountDisplay.textContent = '0 / 0';
            updateActionButtonsState();
            return;
        }

        const word = words[currentWordIndex];
        let htmlContent = '';

        if (isCardShowingFront) { // 表の表示
            if (word.category === '1' || word.category === '2') { // 区分1と2で表の表示を共通化も検討 (仕様による)
                htmlContent = `<span class="chinese-text" data-speak="${word.chinese}">${word.chinese}</span>`;
                 if (word.category === '2') { // 区分2の表は日本語訳
                    htmlContent = `<span>${word.japanese}</span>`;
                }
            } else {
                htmlContent = `<span>不明な区分: ${word.category}</span>`;
            }
        } else { // 裏の表示
            // 改善点(1)(2): 区分1,2共に中国語、ピンイン、日本語訳を表示。ラベルなし。
            htmlContent = `
                <p><strong class="chinese-text" data-speak="${word.chinese}">${word.chinese}</strong></p>
                <p>${word.pinyin}</p>
                <p>${word.japanese}</p>
            `;
            // 改善点(3): 裏面表示時に中国語の音声を自動再生
            speakChinese(word.chinese);
        }
        cardSurface.innerHTML = htmlContent;
        cardCountDisplay.textContent = `${currentWordIndex + 1} / ${words.length}`;
        addSpeakListenersToCard();
        updateActionButtonsState();
    }

    // nextButton, backButton listeners (変更なし)
    // ... (前回のnextButton, backButtonリスナーをそのまま使用) ...
    nextButton.addEventListener('click', () => {
        if (words.length === 0) return;

        if (isCardShowingFront) {
            isCardShowingFront = false;
        } else {
            currentWordIndex++;
            if (currentWordIndex >= words.length) {
                currentWordIndex = 0;
            }
            isCardShowingFront = true;
        }
        updateFlashcardDisplay();
    });

    backButton.addEventListener('click', () => {
        if (words.length === 0) return;

        if (!isCardShowingFront) {
            isCardShowingFront = true;
        } else {
            currentWordIndex--;
            if (currentWordIndex < 0) {
                currentWordIndex = words.length - 1;
            }
            isCardShowingFront = true;
        }
        updateFlashcardDisplay();
    });

    // updateActionButtonsState (変更なし)
    // ... (前回のupdateActionButtonsStateをそのまま使用) ...
    function updateActionButtonsState() {
        const hasWords = words.length > 0;
        editWordButton.disabled = !hasWords;
        deleteWordButton.disabled = !hasWords;
        nextButton.disabled = !hasWords;
        backButton.disabled = !hasWords;
    }


    deleteWordButton.addEventListener('click', () => { // フラッシュカードの削除ボタン
        if (words.length === 0) return;
        if (confirm(`「${words[currentWordIndex].chinese}」を削除しますか？`)) {
            words.splice(currentWordIndex, 1);
            saveWords();
            if (currentWordIndex >= words.length && words.length > 0) {
                currentWordIndex = words.length - 1;
            }
            isCardShowingFront = true;
            loadWords(); // これでフラッシュカードも一覧も更新される
        }
    });

    // editWordButton listener (変更なし)
    // ... (前回のeditWordButtonリスナーをそのまま使用) ...
    editWordButton.addEventListener('click', () => {
        if (words.length === 0) return;
        const word = words[currentWordIndex];
        editWordIndexInput.value = currentWordIndex;
        editCategoryInput.value = word.category;
        editChineseInput.value = word.chinese;
        editPinyinInput.value = word.pinyin;
        editJapaneseInput.value = word.japanese;
        editModal.style.display = 'block';
    });


    // --- 音声再生 (Web Speech API) ---
    function speakChinese(text) {
        if (!('speechSynthesis' in window) || !text) {
            // console.warn('Speech synthesis not supported or no text to speak.');
            return;
        }
        window.speechSynthesis.cancel(); // 既存の発言をキャンセル
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN'; // デフォルトまたはフォールバック

        if (chineseVoice) {
            utterance.voice = chineseVoice;
        } else {
            // console.warn('Chinese voice not found, using OS default for zh-CN.');
            // findChineseVoice(); // 再試行 (タイミングによる場合)
        }
        utterance.rate = 0.9;
        
        // iPhone Safariでは、音声再生が非同期で失敗することがあるため、
        // playプロミスをキャッチするなどのエラーハンドリングが推奨されるが、
        // SpeechSynthesisUtteranceには直接的なPromiseはない。
        // イベントリスナーでエラーを捕捉できる場合がある。
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            // alert('音声の再生に失敗しました。ブラウザの設定や音声データを確認してください。');
        };
        
        try {
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Error speaking:", e);
        }
    }

    // addSpeakListenersToCard (変更なし)
    // ... (前回のaddSpeakListenersToCardをそのまま使用) ...
    function addSpeakListenersToCard() {
        const speakElements = cardSurface.querySelectorAll('.chinese-text[data-speak]');
        speakElements.forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                speakChinese(el.dataset.speak);
            });
        });
    }

    // --- 単語一覧機能 ---
    function updateWordListDisplay() {
        wordListTbody.innerHTML = '';
        if (words.length === 0) {
            const row = wordListTbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5; // 列数に合わせて調整
            cell.textContent = '登録されている単語がありません。';
            cell.style.textAlign = 'center';
            return;
        }

        words.forEach((word, index) => {
            const row = wordListTbody.insertRow();
            row.insertCell().textContent = word.category;
            
            const chineseCell = row.insertCell();
            const chineseSpan = document.createElement('span');
            chineseSpan.textContent = word.chinese;
            chineseSpan.classList.add('chinese-text-list');
            chineseSpan.dataset.speak = word.chinese;
            chineseSpan.addEventListener('click', () => speakChinese(word.chinese));
            chineseCell.appendChild(chineseSpan);

            row.insertCell().textContent = word.pinyin;
            row.insertCell().textContent = word.japanese;

            const actionCell = row.insertCell();
            
            // 編集ボタン (アイコン)
            const editBtnList = document.createElement('button');
            editBtnList.innerHTML = '✎'; // 鉛筆アイコン
            editBtnList.title = '編集';
            editBtnList.classList.add('icon-button');
            editBtnList.addEventListener('click', () => {
                currentWordIndex = index; 
                isCardShowingFront = true; 
                editWordButton.click(); // フラッシュカードセクションの編集ボタンのイベントを発火
            });
            actionCell.appendChild(editBtnList);

            // 削除ボタン (アイコン)
            const deleteBtnList = document.createElement('button');
            deleteBtnList.innerHTML = '✖'; // バツアイコン
            deleteBtnList.title = '削除';
            deleteBtnList.classList.add('icon-button', 'delete');
            deleteBtnList.addEventListener('click', () => {
                if (confirm(`「${words[index].chinese}」を削除しますか？`)) {
                    words.splice(index, 1);
                    saveWords();
                    // currentWordIndexの調整は、フラッシュカード表示に影響する場合のみ考慮
                    // ここでは一覧の再描画と、必要ならフラッシュカードのインデックスも調整
                    if (currentWordIndex === index) { // 削除したのがフラッシュカードで表示中のものだった場合
                        if (currentWordIndex >= words.length && words.length > 0) {
                            currentWordIndex = words.length - 1;
                        }
                        // isCardShowingFront = true; // loadWordsでリセットされる
                    } else if (currentWordIndex > index) { // 削除したのが表示中より前の場合
                        currentWordIndex--;
                    }
                    loadWords(); // フラッシュカードの状態も更新
                    updateWordListDisplay(); // 一覧を再表示
                }
            });
            actionCell.appendChild(deleteBtnList);
        });
    }

    // --- 編集モーダル関連 ---
    // closeModalButton, window click listener for modal (変更なし)
    // ... (前回のモーダル関連リスナーをそのまま使用) ...
    closeModalButton.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == editModal) {
            editModal.style.display = 'none';
        }
    });

    saveEditButton.addEventListener('click', () => {
        const index = parseInt(editWordIndexInput.value);
        const newCategory = editCategoryInput.value.trim();
        const newChinese = editChineseInput.value.trim();
        const newPinyin = editPinyinInput.value.trim();
        const newJapanese = editJapaneseInput.value.trim();

        if (!newCategory || !newChinese || !newPinyin || !newJapanese) {
            alert('すべての項目を入力してください。');
            return;
        }
        if (newCategory !== '1' && newCategory !== '2') {
            alert('区分は 1 または 2 を入力してください。');
            return;
        }

        words[index] = {
            category: newCategory,
            chinese: newChinese,
            pinyin: newPinyin,
            japanese: newJapanese
        };
        saveWords();
        editModal.style.display = 'none';
        isCardShowingFront = true;
        loadWords();
        alert('単語を更新しました。');
    });

    // --- 初期化 ---
    loadWords();
    showSection('flashcard-section');
});