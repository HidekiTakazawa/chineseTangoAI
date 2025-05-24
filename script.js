document.addEventListener('DOMContentLoaded', () => {
    // Navigation Elements
    const navToFlashcardButton = document.getElementById('nav-to-flashcard');
    const navToImportButton = document.getElementById('nav-to-import');
    const navToListButton = document.getElementById('nav-to-list');
    const navButtons = [navToFlashcardButton, navToImportButton, navToListButton];

    // Section Elements
    const dataImportSection = document.getElementById('data-import-section');
    const flashcardSection = document.getElementById('flashcard-section');
    const wordListSection = document.getElementById('word-list-section');
    const allSections = [dataImportSection, flashcardSection, wordListSection];

    // Data Import Elements
    const csvInput = document.getElementById('csv-input');
    const importCsvButton = document.getElementById('import-csv-button');
    const clearAllDataButton = document.getElementById('clear-all-data-button');

    // Flashcard Elements
    const cardSurface = document.getElementById('card-surface');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');
    const editWordButton = document.getElementById('edit-word-button');
    const deleteWordButton = document.getElementById('delete-word-button');
    const cardCountDisplay = document.getElementById('card-count');

    // Word List Elements
    // const showWordListButton = document.getElementById('show-word-list-button'); // No longer used
    const wordListTbody = document.getElementById('word-list-tbody');
    const backToFlashcardFromListButton = document.getElementById('back-to-flashcard-from-list');


    // Edit Modal Elements
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

    // --- Navigation and Section Management ---
    function showSection(sectionToShow) {
        allSections.forEach(section => {
            if (section.id === sectionToShow) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
        // Update active state for nav buttons
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
        // フラッシュカード表示時に内容を更新（単語が追加/削除された場合を考慮）
        updateFlashcardDisplay();
    });

    navToImportButton.addEventListener('click', () => {
        showSection('data-import-section');
    });

    navToListButton.addEventListener('click', () => {
        showSection('word-list-section');
        updateWordListDisplay(); // 一覧表示時に最新の状態にする
    });

    backToFlashcardFromListButton.addEventListener('click', () => {
        showSection('flashcard-section');
        updateFlashcardDisplay();
    });


    // --- データ管理 ---
    function loadWords() {
        const storedWords = localStorage.getItem(localStorageKey);
        if (storedWords) {
            words = JSON.parse(storedWords);
        } else {
            words = [];
        }
        currentWordIndex = 0;
        isCardShowingFront = true;
        // 初期表示はフラッシュカードなので、ここで更新
        updateFlashcardDisplay();
        // updateWordListDisplay(); // 一覧は表示時に更新
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
            loadWords(); // データを再読み込みしてフラッシュカードに反映
            showSection('flashcard-section'); // フラッシュカード画面に遷移
        } catch (error) {
            alert(`エラー: ${error.message}`);
        }
    });

    clearAllDataButton.addEventListener('click', () => {
        if (confirm('本当にすべての単語データを削除しますか？この操作は元に戻せません。')) {
            words = [];
            saveWords();
            loadWords(); // 表示を更新
            alert('すべての単語データを削除しました。');
            // 現在のセクションがデータインポートならそのままで良いが、
            // 他のセクションにいる可能性も考慮し、フラッシュカードに戻すなどしても良い
            if (!dataImportSection.classList.contains('hidden')) {
                // データインポート画面にいる場合はそのままでOK
            } else {
                showSection('flashcard-section'); // 他の画面ならフラッシュカードへ
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

        // currentWordIndexがwordsの範囲外になっていないかチェック
        if (currentWordIndex >= words.length) {
            currentWordIndex = 0;
        }
        if (currentWordIndex < 0 && words.length > 0) { // wordsが空でない場合のみ
            currentWordIndex = words.length - 1;
        }
        // wordsが空になった場合
        if (words.length === 0) {
             cardSurface.innerHTML = '登録されている単語がありません。<br>「単語登録」からデータを登録してください。';
            cardCountDisplay.textContent = '0 / 0';
            updateActionButtonsState();
            return;
        }


        const word = words[currentWordIndex];
        let htmlContent = '';

        if (isCardShowingFront) {
            if (word.category === '1') {
                htmlContent = `<span class="chinese-text" data-speak="${word.chinese}">${word.chinese}</span>`;
            } else if (word.category === '2') {
                htmlContent = `<span>${word.japanese}</span>`;
            } else {
                htmlContent = `<span>不明な区分: ${word.category}</span>`;
            }
        } else {
            if (word.category === '1') {
                htmlContent = `
                    <p><strong class="chinese-text" data-speak="${word.chinese}">${word.chinese}</strong></p>
                    <p>ピンイン: ${word.pinyin}</p>
                    <p>日本語訳: ${word.japanese}</p>
                `;
            } else if (word.category === '2') {
                htmlContent = `
                    <p><strong class="chinese-text" data-speak="${word.chinese}">${word.chinese}</strong></p>
                    <p>ピンイン: ${word.pinyin}</p>
                `;
            } else {
                htmlContent = `<span>不明な区分: ${word.category}</span>`;
            }
        }
        cardSurface.innerHTML = htmlContent;
        cardCountDisplay.textContent = `${currentWordIndex + 1} / ${words.length}`;
        addSpeakListenersToCard();
        updateActionButtonsState();
    }

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
            // Backボタンで前のカードの表を表示する仕様に変更
            isCardShowingFront = true;
        }
        updateFlashcardDisplay();
    });
    
    function updateActionButtonsState() {
        const hasWords = words.length > 0;
        editWordButton.disabled = !hasWords;
        deleteWordButton.disabled = !hasWords;
        nextButton.disabled = !hasWords;
        backButton.disabled = !hasWords;
    }

    deleteWordButton.addEventListener('click', () => {
        if (words.length === 0) return;
        if (confirm(`「${words[currentWordIndex].chinese}」を削除しますか？`)) {
            words.splice(currentWordIndex, 1);
            saveWords();
            // インデックス調整: 削除後、現在のインデックスが配列長以上なら調整
            if (currentWordIndex >= words.length && words.length > 0) {
                currentWordIndex = words.length - 1;
            } else if (words.length === 0) {
                // currentWordIndex = 0; // loadWordsで処理される
            }
            isCardShowingFront = true;
            loadWords(); // データを再読み込みしてフラッシュカードと一覧に反映
            // updateFlashcardDisplay(); // loadWords内で呼ばれる
            // updateWordListDisplay(); // 必要ならここで呼ぶが、一覧表示時に更新される
        }
    });

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
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        } else {
            alert('お使いのブラウザは音声合成に対応していません。');
        }
    }

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
    // showWordListButton は削除されたので、関連イベントリスナーも不要

    function updateWordListDisplay() {
        wordListTbody.innerHTML = '';
        if (words.length === 0) {
            const row = wordListTbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
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
            const editBtnList = document.createElement('button');
            editBtnList.textContent = '編集';
            editBtnList.classList.add('small-edit-button');
            editBtnList.addEventListener('click', () => {
                currentWordIndex = index; 
                isCardShowingFront = true; 
                // updateFlashcardDisplay(); // モーダル表示前にフラッシュカードを更新する必要はない
                editWordButton.click(); // フラッシュカードセクションの編集ボタンのイベントを発火
            });
            actionCell.appendChild(editBtnList);
        });
    }

    // --- 編集モーダル関連 ---
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
        loadWords(); // データを再読み込みしてフラッシュカードと一覧に反映
        // updateFlashcardDisplay(); // loadWords内で呼ばれる
        // updateWordListDisplay(); // 必要ならここで呼ぶが、一覧表示時に更新される
        alert('単語を更新しました。');
    });

    // --- 初期化 ---
    loadWords(); // 最初に単語を読み込み
    showSection('flashcard-section'); // 初期表示はフラッシュカードセクション
});