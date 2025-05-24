document.addEventListener('DOMContentLoaded', () => {
    const csvInput = document.getElementById('csv-input');
    const importCsvButton = document.getElementById('import-csv-button');
    const clearAllDataButton = document.getElementById('clear-all-data-button');

    const cardSurface = document.getElementById('card-surface');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');
    const editWordButton = document.getElementById('edit-word-button');
    const deleteWordButton = document.getElementById('delete-word-button');
    const cardCountDisplay = document.getElementById('card-count');

    const showWordListButton = document.getElementById('show-word-list-button');
    const wordListTbody = document.getElementById('word-list-tbody');

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
    let isCardShowingFront = true; // true: 表, false: 裏

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
        updateFlashcardDisplay();
        updateWordListDisplay();
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
            loadWords(); // 再読み込みして表示を更新
            csvInput.value = ''; // 入力欄をクリア
            alert(`${newWords.length}件の単語を登録しました。`);
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
        }
    });

    // --- フラッシュカード機能 ---
    function updateFlashcardDisplay() {
        if (words.length === 0) {
            cardSurface.innerHTML = '登録されている単語がありません。';
            cardCountDisplay.textContent = '0 / 0';
            updateActionButtonsState();
            return;
        }

        const word = words[currentWordIndex];
        let htmlContent = '';

        if (isCardShowingFront) { // 表の表示
            if (word.category === '1') {
                htmlContent = `<span class="chinese-text" data-speak="${word.chinese}">${word.chinese}</span>`;
            } else if (word.category === '2') {
                htmlContent = `<span>${word.japanese}</span>`;
            } else {
                htmlContent = `<span>不明な区分: ${word.category}</span>`;
            }
        } else { // 裏の表示
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

        if (isCardShowingFront) { // 表が表示されている場合
            isCardShowingFront = false; // 裏を表示する
        } else { // 裏が表示されている場合
            currentWordIndex++;
            if (currentWordIndex >= words.length) {
                currentWordIndex = 0; // 最後まで行ったら最初に戻る
            }
            isCardShowingFront = true; // 次のカードの表を表示
        }
        updateFlashcardDisplay();
    });

    backButton.addEventListener('click', () => {
        if (words.length === 0) return;

        if (!isCardShowingFront) { // 裏が表示されている場合
            isCardShowingFront = true; // 同じカードの表を表示する
        } else { // 表が表示されている場合
            currentWordIndex--;
            if (currentWordIndex < 0) {
                currentWordIndex = words.length - 1; // 最初から戻ったら最後へ
            }
            isCardShowingFront = false; // 前のカードの裏を表示 (仕様に合わせて調整。通常は表から)
                                       // 仕様では「自由に前後移動」なので、Backで前のカードの表を表示する方が自然かもしれません。
                                       // ここではNextの逆操作として、前のカードの裏を表示するようにしています。
                                       // もしBackで常に表を表示したい場合は isCardShowingFront = true; にします。
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
            if (currentWordIndex >= words.length && words.length > 0) {
                currentWordIndex = words.length - 1;
            } else if (words.length === 0) {
                currentWordIndex = 0;
            }
            isCardShowingFront = true;
            updateFlashcardDisplay();
            updateWordListDisplay();
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
            // 既存の発言があればキャンセル
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN'; // 中国語（中国本土）
            utterance.rate = 0.9; // 少しゆっくりめに
            window.speechSynthesis.speak(utterance);
        } else {
            alert('お使いのブラウザは音声合成に対応していません。');
        }
    }

    function addSpeakListenersToCard() {
        const speakElements = cardSurface.querySelectorAll('.chinese-text[data-speak]');
        speakElements.forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation(); // 親要素へのイベント伝播を防ぐ
                speakChinese(el.dataset.speak);
            });
        });
    }


    // --- 単語一覧機能 ---
    showWordListButton.addEventListener('click', () => {
        updateWordListDisplay(); // 最新のデータで一覧を更新・表示
    });

    function updateWordListDisplay() {
        wordListTbody.innerHTML = ''; // 一覧をクリア
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
            const editBtn = document.createElement('button');
            editBtn.textContent = '編集';
            editBtn.classList.add('small-edit-button'); // CSSでスタイル調整用
            editBtn.addEventListener('click', () => {
                // フラッシュカードの編集ボタンと同じロジックを呼び出すか、
                // currentWordIndex を設定してモーダルを開く
                currentWordIndex = index; // この単語を現在の編集対象にする
                isCardShowingFront = true; // 表を表示状態に
                updateFlashcardDisplay(); // フラッシュカードも同期
                editWordButton.click(); // 既存の編集ボタンのクリックイベントを発火
            });
            actionCell.appendChild(editBtn);
        });
    }

    // --- 編集モーダル関連 ---
    closeModalButton.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => { // モーダル外クリックで閉じる
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
        // currentWordIndex は変更ボタン押下時に設定されているはずなので、そのまま表示更新
        isCardShowingFront = true; // 編集後は表から表示
        updateFlashcardDisplay();
        updateWordListDisplay();
        alert('単語を更新しました。');
    });

    // --- 初期化 ---
    loadWords();
});