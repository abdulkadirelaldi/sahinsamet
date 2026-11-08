import type { Parkur } from './tipler';

/**
 * YAZILIM İNGİLİZCESİ (2026-11-06) — programlama, hata ayıklama, sürüm kontrolü,
 * dokümantasyon, datasheet ve teknik yazım. A2'den C1'e. Kimlikler KALICI.
 */

const CAN_SEND_DOC = `int can_send(const can_frame_t *frame, uint32_t timeout_ms)

Queues a frame for transmission. Blocks until there is space in the TX queue or the timeout expires.

Returns: 0 on success, -ETIMEDOUT if the timeout expires, -EINVAL if frame is NULL.
Note: Not safe to call from an interrupt handler.`;

const MCU_RATINGS = `ABSOLUTE MAXIMUM RATINGS
  Supply voltage (VDD) ......... -0.3 V to 4.0 V
  Input voltage on any pin ..... -0.3 V to VDD + 0.3 V
  Storage temperature .......... -55 °C to 150 °C

RECOMMENDED OPERATING CONDITIONS
  Parameter         Min    Typ    Max    Unit
  Supply voltage    1.8    3.3    3.6    V
  Operating temp.   -40    25     85     °C`;

export const YAZILIM: Parkur = {
  id: 'yazilim',
  ad: 'Yazılım İngilizcesi',
  aciklama:
    'Kod, hata mesajı, dokümantasyon ve datasheet okumayı; commit, PR ve hata raporu yazmayı, teknik toplantıda konuşmayı öğreten mühendis İngilizcesi.',
  uniteler: [
    // ─────────────────────────────────────────────── ÜNİTE 1 — A2
    {
      id: 'yazilim-u1',
      seviye: 'A2',
      gorsel: '💻',
      baslik: 'Programlamanın temelleri',
      ozet: 'Değişken, fonksiyon, döngü gibi temel terimler ve derleme-çalıştırma dili.',
      dersler: [
        {
          id: 'yazilim-u1-d1',
          baslik: 'Kodun yapı taşları',
          gorsel: '🧱',
          not: `Yazılım terimlerinin çoğu Türkçede de İngilizce haliyle kullanılır; ama İngilizce cümle içinde doğru fiil ve doğru tekil/çoğul ile kullanmak gerekir.

**Temel terimler**
- **variable**: değişken
- **function**: fonksiyon
- **loop**: döngü (for loop, while loop)
- **array**: dizi
- **string**: metin, karakter dizisi
- **integer**: tam sayı; **boolean**: true/false değeri

**Kalıp:** Kodun ne yaptığını geniş zamanla, özneye -s ekleyerek anlatırız: "A variable stores a value."

- A variable stores a value. — Bir değişken bir değer saklar.
- This loop runs ten times. — Bu döngü on kez çalışır.
- The array contains five strings. — Dizi beş metin içerir.
- The function takes two integers. — Fonksiyon iki tam sayı alır.

**Sık yapılan hata:** "I wrote a code" ❌. İngilizcede "code" sayılamaz: "I wrote some code", "a piece of code", "this code" ✅. Aynı şekilde "informations" ❌ yerine "information" ✅, "softwares" ❌ yerine "software" ✅.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u1-d1-a1',
              ciftler: [
                ['variable', 'değişken'],
                ['function', 'fonksiyon'],
                ['loop', 'döngü'],
                ['array', 'dizi'],
                ['string', 'metin (karakter dizisi)'],
                ['integer', 'tam sayı'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d1-a2',
              soru: 'A ___ stores a value, such as a number or a name.',
              secenekler: ['loop', 'variable', 'compiler'],
              dogru: 1,
              aciklama:
                'Değer saklayan şey değişkendir (variable). Loop bir işi tekrarlar, compiler ise kodu derler; ikisi de değer saklamaz.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d1-a3',
              soru: 'This ___ runs ten times and prints each number.',
              secenekler: ['array', 'string', 'loop', 'integer'],
              dogru: 2,
              aciklama:
                '"Ten times" (on kez) tekrar anlatır; tekrar eden yapı döngüdür (loop). Array, string ve integer veri türleridir, "çalışmazlar".',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d1-a4',
              soru: 'In most languages, true and false are ___ values.',
              secenekler: ['boolean', 'string', 'array'],
              dogru: 0,
              aciklama:
                'Yalnızca true ya da false olabilen tür boolean’dır. Tırnak içinde yazılırsa ("true") string olur ama değerin kendisi boolean’dır.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u1-d1-a5',
              soru: 'Which sentence is correct?',
              secenekler: [
                'I wrote a code for the sensor.',
                'I wrote some code for the sensor.',
                'I wrote codes for the sensor.',
              ],
              dogru: 1,
              aciklama:
                'Programlama anlamında "code" sayılamayan bir isimdir; "a code" ya da "codes" denmez. "Some code" ya da yalnızca "code" doğrudur. ("Error codes" gibi sayılabilen "kod numarası" anlamı ayrıdır.)',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u1-d1-a6',
              cumle: 'This variable stores the user name.',
              anlam: 'Bu değişken kullanıcı adını saklar.',
              celdiriciler: ['store', 'a', 'names'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u1-d1-a7',
              cumle: 'The array contains five strings.',
              anlam: 'Dizi beş metin içerir.',
              celdiriciler: ['contain', 'string', 'loops'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u1-d1-a8',
              cumle: 'The function takes two integers.',
              anlam: 'Fonksiyon iki tam sayı alır.',
              ipucu:
                'integer: /ˈɪntɪdʒər/ "İN-ti-cır"; vurgu ilk hecede, "g" harfi "c" gibi okunur.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u1-d1-a9',
              kaynak: 'Bu döngü on kez çalışır.',
              cevaplar: [
                'This loop runs ten times.',
                'This loop runs 10 times.',
                'This loop executes ten times.',
                'This loop executes 10 times.',
                'This loop iterates ten times.',
                'This loop iterates 10 times.',
                'This loop repeats ten times.',
                'This loop repeats 10 times.',
                'This loop is executed ten times.',
                'This loop is executed 10 times.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u1-d1-a10',
              kaynak: 'Değişken bir değer saklar.',
              cevaplar: [
                'A variable stores a value.',
                'The variable stores a value.',
                'A variable holds a value.',
                'The variable holds a value.',
                'A variable contains a value.',
                'The variable contains a value.',
              ],
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u1-d1-a11',
              metin: `let count = 0;
for (const item of items) {
  count = count + 1;
}`,
              soru: 'What does this code do?',
              secenekler: [
                'It deletes every item in the array.',
                'It sorts the array by name.',
                'It counts the items in the array.',
              ],
              dogru: 2,
              aciklama:
                'Döngü dizideki her öğe için count değişkenini bir artırır; sonunda count öğe sayısına eşit olur. Kod hiçbir öğeyi silmez ya da sıralamaz.',
            },
          ],
        },
        {
          id: 'yazilim-u1-d2',
          baslik: 'Fonksiyonlar: parametre, argüman, dönüş değeri',
          gorsel: '⚙️',
          not: `Fonksiyonlardan söz ederken en çok karıştırılan iki terim **parameter** ve **argument**’tır.

- **parameter**: fonksiyon TANIMINDAKİ isim. function add(a, b) içindeki a ve b.
- **argument**: fonksiyon ÇAĞRILIRKEN verilen gerçek değer. add(2, 3) içindeki 2 ve 3.
- **call** a function: fonksiyonu çağırmak
- **pass** an argument: argüman geçirmek, aktarmak
- **return** a value: değer döndürmek; **return value**: dönüş değeri

**Kalıp:** "The function takes two parameters and returns their sum."

- We call the function with two arguments. — Fonksiyonu iki argümanla çağırıyoruz.
- We pass the user ID to the function. — Kullanıcı kimliğini fonksiyona geçiriyoruz.
- It returns the sum. — Toplamı döndürür.
- The return value is a string. — Dönüş değeri bir metindir.

**Sık yapılan hata:** "The function returns to the sum" ❌. Değer döndürürken "to" kullanılmaz: "returns the sum" ✅. "Return to" yalnızca bir yere geri dönmek demektir: "Execution returns to the caller."`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u1-d2-a1',
              ciftler: [
                ['parameter', 'parametre (tanımdaki isim)'],
                ['argument', 'argüman (çağrıdaki değer)'],
                ['return value', 'dönüş değeri'],
                ['call', 'çağırmak'],
                ['pass', 'aktarmak, geçirmek'],
                ['sum', 'toplam'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d2-a2',
              soru: 'In the definition function add(a, b), a and b are ___.',
              secenekler: ['arguments', 'parameters', 'return values'],
              dogru: 1,
              aciklama:
                'Fonksiyon tanımındaki isimler parameter’dır. Argument, çağrı sırasında bu parametrelere verilen gerçek değerdir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d2-a3',
              soru: 'In the call add(2, 3), the values 2 and 3 are ___.',
              secenekler: ['parameters', 'variables', 'arguments'],
              dogru: 2,
              aciklama:
                'Çağrıda verilen gerçek değerler argument’tır. Akılda tutmak için: parameter tanımda, argument çağrıda.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d2-a4',
              soru: 'The function ___ the sum of the two numbers.',
              secenekler: ['returns', 'returns to', 'is returning to'],
              dogru: 0,
              aciklama:
                'Değer döndürmek "return something" kalıbıdır, araya "to" girmez. "Return to" bir yere geri dönmek anlamına gelir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d2-a5',
              soru: 'We ___ two arguments to the function.',
              secenekler: ['return', 'pass', 'call'],
              dogru: 1,
              aciklama:
                'Fonksiyona argüman vermek "pass an argument to a function" diye söylenir. "Call" fonksiyonun kendisi için kullanılır: "call the function".',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u1-d2-a6',
              cumle: 'The function returns the sum of two numbers.',
              anlam: 'Fonksiyon iki sayının toplamını döndürür.',
              celdiriciler: ['to', 'return', 'number'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u1-d2-a7',
              cumle: 'Call the function with two arguments.',
              anlam: 'Fonksiyonu iki argümanla çağır.',
              celdiriciler: ['parameters', 'calls', 'by'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u1-d2-a8',
              cumle: 'This function takes two parameters and returns a string.',
              anlam: 'Bu fonksiyon iki parametre alır ve bir metin döndürür.',
              ipucu:
                'parameter: /pəˈræmɪtər/ "pı-RE-mı-tır"; vurgu ikinci hecede, oradaki ses "a" ile "e" arası açık bir sestir. Türkçedeki gibi "pa-ra-met-re" demeyin.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u1-d2-a9',
              kaynak: 'Fonksiyon iki parametre alır.',
              cevaplar: [
                'The function takes two parameters.',
                'The function accepts two parameters.',
                'The function has two parameters.',
                'The function takes 2 parameters.',
                'The function accepts 2 parameters.',
                'It takes two parameters.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u1-d2-a10',
              kaynak: 'Fonksiyon bir metin döndürür.',
              cevaplar: [
                'The function returns a string.',
                'The function returns a string value.',
                'It returns a string.',
              ],
              aciklama: 'Programlamada "metin" türü için "string" denir; "a text" doğal değildir.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u1-d2-a11',
              metin: `function area(width, height) {
  return width * height;
}

const result = area(4, 5);`,
              soru: 'Which statement is correct?',
              secenekler: [
                'width and height are arguments; 4 and 5 are parameters.',
                'width and height are parameters; 4 and 5 are arguments.',
                'area returns the sum of 4 and 5.',
              ],
              dogru: 1,
              aciklama:
                'Tanımdaki width ve height parametredir, çağrıdaki 4 ve 5 argümandır. Fonksiyon çarpım (width * height) döndürür, toplam değil; result 20 olur.',
            },
          ],
        },
        {
          id: 'yazilim-u1-d3',
          baslik: 'Derlemek, çalıştırmak, kurmak',
          gorsel: '🛠️',
          not: `Kodu yazdıktan sonraki adımların İngilizcesi:

- **compile**: derlemek; **compiler**: derleyici
- **build**: projeyi derleyip çalışır hale getirmek; isim olarak derleme işlemi ya da çıktısı ("the build failed": derleme başarısız oldu)
- **run / execute**: çalıştırmak
- **install**: kurmak; **dependency**: bağımlılık (projenin ihtiyaç duyduğu paket)
- **source code**: kaynak kod; **executable**: çalıştırılabilir dosya
- **flash**: ürün yazılımını (firmware) karta yüklemek

**Kalıp:** "First install the dependencies, then build the project and run the tests."

- The compiler turns source code into an executable. — Derleyici kaynak kodu çalıştırılabilir dosyaya dönüştürür.
- The build failed. — Derleme başarısız oldu.
- Run the program from the terminal. — Programı terminalden çalıştır.
- We flash the firmware to the board. — Ürün yazılımını karta yüklüyoruz.

**Sık yapılan hata:** Türkçedeki "çalışmak" iki anlama gelir. Program başlıyorsa **run** ("It runs"), doğru sonuç veriyorsa **work** ("It works"). "The program runs but it does not work correctly" = Program çalışıyor ama doğru çalışmıyor.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u1-d3-a1',
              ciftler: [
                ['compile', 'derlemek'],
                ['run', 'çalıştırmak'],
                ['install', 'kurmak'],
                ['source code', 'kaynak kod'],
                ['executable', 'çalıştırılabilir dosya'],
                ['dependency', 'bağımlılık'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d3-a2',
              soru: 'The compiler turns source code into an ___ file.',
              secenekler: ['executable', 'install', 'source'],
              dogru: 0,
              aciklama:
                'Derleyicinin çıktısı çalıştırılabilir dosyadır (executable file). "Source" girdidir, çıktı değil; "install" bir fiildir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d3-a3',
              soru: 'First ___ the dependencies, then build the project.',
              secenekler: ['return', 'install', 'call'],
              dogru: 1,
              aciklama:
                'Bağımlılıklar (paketler) kurulur: "install the dependencies". Return ve call fonksiyonlarla kullanılır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u1-d3-a4',
              soru: "The program ___, but it doesn't work correctly: the output is wrong.",
              secenekler: ['runs', 'works', 'run'],
              dogru: 0,
              aciklama:
                'Program başlıyor ama yanlış sonuç veriyor: başlamak "run", doğru çalışmak "work". "It works, but it doesn’t work" çelişkili olurdu; "The program run" ise tekil öznede -s eki eksik olduğu için yanlıştır.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u1-d3-a5',
              soru: '"Kod çalışmıyor, yanlış sonuç veriyor." Hangisi en doğal İngilizce karşılıktır?',
              secenekler: [
                "The code doesn't execute the result.",
                "The code doesn't work.",
                "The code isn't operating good.",
              ],
              dogru: 1,
              aciklama:
                'Beklenen işi yapmamak için "doesn’t work" kullanılır. Diğer iki seçenek hem anlam hem dil bilgisi açısından yanlıştır ("good" değil "well" olmalıydı).',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u1-d3-a6',
              cumle: 'Run the program from the terminal.',
              anlam: 'Programı terminalden çalıştır.',
              celdiriciler: ['work', 'in', 'programs'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u1-d3-a7',
              cumle: 'We flash the firmware to the board.',
              anlam: 'Ürün yazılımını karta yüklüyoruz.',
              celdiriciler: ['flush', 'on', 'boards'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u1-d3-a8',
              cumle: 'The build failed because of a missing dependency.',
              anlam: 'Eksik bir bağımlılık yüzünden derleme başarısız oldu.',
              ipucu:
                'build: /bɪld/ "bild"; "u" okunmaz. dependency: "di-PEN-dın-si", vurgu ikinci hecede.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u1-d3-a9',
              kaynak: 'Projeyi derle ve testleri çalıştır.',
              cevaplar: [
                'Build the project and run the tests.',
                'Compile the project and run the tests.',
                'Build the project, then run the tests.',
                'Compile the project, then run the tests.',
                'Build the project and execute the tests.',
                'Compile the project and execute the tests.',
                'Build the project and then run the tests.',
                'Compile the project and then run the tests.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u1-d3-a10',
              kaynak: 'Program çalışıyor ama doğru çalışmıyor.',
              cevaplar: [
                'The program runs but it does not work correctly.',
                'The program runs but does not work correctly.',
                'The program runs but it does not work properly.',
                'The program runs but does not work properly.',
                'The program is running but it is not working correctly.',
                'The program is running but not working correctly.',
                'The program is running but it is not working properly.',
                'The program is running but not working properly.',
              ],
              aciklama:
                'Başlamak "run", doğru sonuç vermek "work": iki "çalışmak" iki ayrı fiildir.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u1-d3-a11',
              metin: `$ make
gcc -Wall -o sensor main.c
main.c:12:5: error: 'temp' undeclared (first use in this function)
make: *** [sensor] Error 1`,
              soru: 'What happened?',
              secenekler: [
                'The code compiled, but the program crashed while running.',
                'The dependencies were installed successfully.',
                'The build failed because a variable was not declared.',
              ],
              dogru: 2,
              aciklama:
                '"undeclared" = bildirilmemiş (declare edilmemiş): temp değişkeni kullanılmadan önce bildirilmemiş. Hata derleme sırasında çıktı ve derleme durdu; program hiç oluşmadı, dolayısıyla çalıştırılmadı.',
            },
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────── ÜNİTE 2 — A2
    {
      id: 'yazilim-u2',
      seviye: 'A2',
      gorsel: '🗣️',
      baslik: 'Kodu sesli okumak ve anlatmak',
      ozet: 'Sembolleri sesli okumak, kodun ne yaptığını geniş zaman ve edilgen yapıyla anlatmak.',
      dersler: [
        {
          id: 'yazilim-u2-d1',
          baslik: 'Sembolleri sesli okumak',
          gorsel: '🔣',
          not: `Kod incelemesinde ya da ekran paylaşımında kodu sesli okumanız gerekir. En sık semboller:

- ( ) **parentheses** (tekili parenthesis), kısaca "parens"
- [ ] **square brackets** ya da yalnızca "brackets"
- { } **curly braces** ya da "braces"
- ; **semicolon**, : **colon**
- _ **underscore**, - **hyphen / dash**
- . kodda ve dosya adında **dot**, cümle sonunda **period**
- / **slash**, \\ **backslash**, * **asterisk**, = **equals**

**Kalıp:** Atama için "set x to five" ya da "x equals five", karşılaştırma (==) için "if x equals zero" / "if x is equal to zero".

- user.name → "user dot name"
- MAX_SPEED → "max underscore speed"
- index.html → "index dot html"
- items[0] → "items at index zero" ya da "the first element of items"

**Sık yapılan hata:** Türkçede hepsine "parantez" deriz; İngilizcede ( ) parentheses, [ ] brackets, { } braces ayrı kelimelerdir. Dosya adında "point" ❌ değil "dot" ✅ denir.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u2-d1-a1',
              ciftler: [
                ['parentheses', 'normal parantez ( )'],
                ['square brackets', 'köşeli parantez [ ]'],
                ['curly braces', 'süslü parantez { }'],
                ['semicolon', 'noktalı virgül'],
                ['underscore', 'alt çizgi'],
                ['asterisk', 'yıldız işareti'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u2-d1-a2',
              soru: 'In C, a code block is wrapped in ___.',
              secenekler: ['parentheses', 'curly braces', 'semicolons'],
              dogru: 1,
              aciklama:
                'C’de kod bloğu { } arasına yazılır; bunlara curly braces denir. Parentheses ( ) koşul ve argümanlar içindir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u2-d1-a3',
              soru: "You read the file name index.html aloud as 'index ___ html'.",
              secenekler: ['point', 'dot', 'period', 'full stop'],
              dogru: 1,
              aciklama:
                'Dosya adlarında, alan adlarında ve kodda nokta "dot" diye okunur. "Period" cümle sonundaki noktadır; "point" ondalık sayılarda kullanılır (three point three).',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u2-d1-a4',
              soru: 'In items[0], the zero is inside square ___.',
              secenekler: ['braces', 'brackets', 'parentheses'],
              dogru: 1,
              aciklama:
                '[ ] işaretleri square brackets’tır. "Square braces" ya da "square parentheses" denmez.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u2-d1-a5',
              soru: 'How do you say MAX_SPEED aloud?',
              secenekler: ['max dash speed', 'max hyphen speed', 'max underscore speed'],
              dogru: 2,
              aciklama:
                'Alt çizgi (_) "underscore" diye okunur. Dash ve hyphen kısa çizgidir (-), örneğin max-speed.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u2-d1-a6',
              cumle: 'Set the speed variable to zero.',
              anlam: 'Hız değişkenini sıfıra ayarla.',
              celdiriciler: ['equals', 'sets', 'one'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u2-d1-a7',
              cumle: 'Add a semicolon at the end of the line.',
              anlam: 'Satırın sonuna noktalı virgül ekle.',
              celdiriciler: ['colon', 'in', 'lines'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u2-d1-a8',
              cumle: 'Put the condition inside parentheses.',
              anlam: 'Koşulu parantez içine yaz.',
              ipucu:
                'parentheses: /pəˈrenθəsiːz/ "pı-REN-tı-siiz"; "th" dil dişlerin arasındayken söylenir. Tekili parenthesis "pı-REN-tı-sis".',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u2-d1-a9',
              kaynak: 'Satırın sonuna noktalı virgül ekle.',
              cevaplar: [
                'Add a semicolon at the end of the line.',
                'Add a semicolon to the end of the line.',
                'Put a semicolon at the end of the line.',
                'Insert a semicolon at the end of the line.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u2-d1-a10',
              kaynak: 'Değişkenin adında alt çizgi var.',
              cevaplar: [
                'The variable name contains an underscore.',
                'The variable name has an underscore.',
                'The variable name includes an underscore.',
                'The name of the variable contains an underscore.',
                'The name of the variable has an underscore.',
                "The variable's name contains an underscore.",
                "The variable's name has an underscore.",
                'There is an underscore in the variable name.',
                'There is an underscore in the name of the variable.',
                "There is an underscore in the variable's name.",
                'The name of the variable includes an underscore.',
              ],
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u2-d1-a11',
              metin: 'if (count == 0) { reset(); }',
              soru: 'Which is the best way to read this line aloud?',
              secenekler: [
                'If count is set to zero, return reset.',
                'If count equals zero, call reset.',
                'If count is zero, define reset.',
              ],
              dogru: 1,
              aciklama:
                '== karşılaştırmadır: "equals" ya da "is equal to". "Is set to" atamadır (=). reset(); bir fonksiyon çağrısıdır: "call reset".',
            },
          ],
        },
        {
          id: 'yazilim-u2-d2',
          baslik: 'Kodun ne yaptığını anlatmak',
          gorsel: '📝',
          not: `Kodun genel davranışını anlatırken **geniş zaman (present simple)** kullanılır: kod her çalıştığında aynı şeyi yapar. Özne tekilse fiile **-s** gelir.

**Sık fiiller**
- **check**: kontrol etmek ("checks whether the input is empty")
- **loop through / iterate over**: her öğeyi tek tek dolaşmak
- **convert**: dönüştürmek; **read / write**: okumak / yazmak
- **print**: ekrana yazdırmak; **send**: göndermek

**Kalıp:** "If ..., it returns ...; otherwise it ..."

- The function checks whether the list is empty. — Fonksiyon listenin boş olup olmadığını kontrol eder.
- It loops through every sensor. — Her sensörü tek tek dolaşır.
- If the input is empty, it returns null. — Girdi boşsa null döndürür.
- The script converts Celsius to Fahrenheit. — Betik Celsius’u Fahrenheit’a dönüştürür.

**Sık yapılan hata:** -s ekini unutmak: "The function return a value" ❌ → "The function returns a value" ✅. Bir de genel davranış için şimdiki zaman kullanmak: "This function is returning the maximum" yerine "This function returns the maximum" ✅.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u2-d2-a1',
              ciftler: [
                ['check', 'kontrol etmek'],
                ['iterate over', 'öğeleri tek tek dolaşmak'],
                ['convert', 'dönüştürmek'],
                ['print', 'ekrana yazdırmak'],
                ['send', 'göndermek'],
                ['otherwise', 'aksi halde'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u2-d2-a2',
              soru: 'The function ___ whether the input is empty.',
              secenekler: ['check', 'checks', 'checking'],
              dogru: 1,
              aciklama:
                'Özne tekil (the function) ve genel davranış anlatılıyor: geniş zaman, fiile -s eklenir: "checks".',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u2-d2-a3',
              soru: 'This loop iterates ___ every sensor in the list.',
              secenekler: ['on', 'over', 'at'],
              dogru: 1,
              aciklama:
                '"Iterate over" kalıptır (bazen "iterate through" da denir). "Iterate on" başka anlama gelir: bir tasarımı tekrar tekrar geliştirmek.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u2-d2-a4',
              soru: 'If the list is empty, the function ___ null.',
              secenekler: ['return', 'returned to', 'returns'],
              dogru: 2,
              aciklama: 'Tekil özne + geniş zaman: "returns". Değer döndürürken "to" kullanılmaz.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u2-d2-a5',
              soru: 'Which sentence best describes what a function always does?',
              secenekler: [
                'The function converts Celsius to Fahrenheit.',
                'The function is converting Celsius to Fahrenheit now.',
                'The function convert Celsius to Fahrenheit.',
              ],
              dogru: 0,
              aciklama:
                'Her seferinde aynı davranış geniş zamanla anlatılır: "converts". "Is converting … now" yalnızca şu ana özgüdür; "The function convert" cümlesinde tekil öznenin -s eki eksik.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u2-d2-a6',
              cumle: 'The function reads the temperature and prints it.',
              anlam: 'Fonksiyon sıcaklığı okur ve ekrana yazdırır.',
              celdiriciler: ['read', 'print', 'them'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u2-d2-a7',
              cumle: 'If the input is empty, it returns null.',
              anlam: 'Girdi boşsa null döndürür.',
              celdiriciler: ['return', 'output', 'nil'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u2-d2-a8',
              cumle: 'This loop goes through each item in the array.',
              anlam: 'Bu döngü dizideki her öğeyi tek tek dolaşır.',
              ipucu:
                'through: /θruː/ "thruu"; dil dişlerin arasında, "tru" değil. array: "ı-REY", vurgu ikinci hecede.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u2-d2-a9',
              kaynak: 'Fonksiyon sıcaklığı okur ve ekrana yazdırır.',
              cevaplar: [
                'The function reads the temperature and prints it.',
                'The function reads the temperature and prints it to the screen.',
                'The function reads the temperature and prints it on the screen.',
                'The function reads the temperature and displays it.',
                'The function reads the temperature and displays it on the screen.',
                'The function reads the temperature and prints it out.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u2-d2-a10',
              kaynak: 'Liste boşsa fonksiyon null döndürür.',
              cevaplar: [
                'If the list is empty, the function returns null.',
                'The function returns null if the list is empty.',
                'If the list is empty, it returns null.',
                'It returns null if the list is empty.',
                'If the list is empty, the function will return null.',
                'The function returns null when the list is empty.',
                'When the list is empty, the function returns null.',
              ],
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u2-d2-a11',
              metin: `def average(values):
    if not values:
        return None
    return sum(values) / len(values)`,
              soru: 'Which description is correct?',
              secenekler: [
                'It returns the sum of the values and raises an error if the list is empty.',
                'It returns the average of the values, or None if the list is empty.',
                'It prints the average and never returns anything.',
              ],
              dogru: 1,
              aciklama:
                'Liste boşsa None döndürür; değilse toplamı eleman sayısına böler, yani ortalamayı döndürür. Hiçbir şey yazdırmaz ve hata fırlatmaz.',
            },
          ],
        },
        {
          id: 'yazilim-u2-d3',
          baslik: 'Edilgen yapı: değer nerede saklanıyor?',
          gorsel: '📦',
          not: `Teknik metinlerde işi KİMİN yaptığı önemli değilse **edilgen yapı (passive)** kullanılır: **is/are + fiilin üçüncü hali (V3)**.

- **is stored**: saklanır; **is called**: çağrılır
- **is passed**: aktarılır; **is sent**: gönderilir
- **is set to**: ...’e ayarlanır; **is initialized**: ilk değeri atanır
- İşi yapanı söylemek istersek **by** kullanılır: "is updated by the interrupt handler"

**Kalıp:** "The value is stored in a variable." / "The callback is called when a packet arrives."

- The result is stored in a global variable. — Sonuç global bir değişkende saklanır.
- This function is called every second. — Bu fonksiyon her saniye çağrılır.
- The counter is set to zero at startup. — Sayaç açılışta sıfıra ayarlanır.
- The data is sent to the server. — Veri sunucuya gönderilir.

**Sık yapılan hata:** V3’ü unutmak: "The data is store in memory" ❌ → "is stored" ✅; "The function is call" ❌ → "is called" ✅. Not: Amerikan teknik İngilizcesinde "data" genellikle tekil fiil alır: "the data is".`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u2-d3-a1',
              ciftler: [
                ['is stored', 'saklanır'],
                ['is called', 'çağrılır'],
                ['is passed', 'aktarılır'],
                ['is initialized', 'ilk değeri atanır'],
                ['is defined', 'tanımlanır'],
                ['is sent', 'gönderilir'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u2-d3-a2',
              soru: 'The result is ___ in a global variable.',
              secenekler: ['store', 'storing', 'stored'],
              dogru: 2,
              aciklama:
                'Edilgen yapı "is + V3" ile kurulur: "is stored". "Is store" ve "is storing" burada yanlıştır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u2-d3-a3',
              soru: 'This function is ___ every time the button is pressed.',
              secenekler: ['called', 'calling', 'calls'],
              dogru: 0,
              aciklama:
                'Fonksiyon kendisi çağırmıyor, çağrılıyor: "is called". "Is calling" fonksiyonun başka bir şeyi çağırdığı anlamına gelirdi.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u2-d3-a4',
              soru: 'The counter is set ___ zero at startup.',
              secenekler: ['on', 'to', 'in'],
              dogru: 1,
              aciklama: 'Bir değere ayarlamak "set something to a value" kalıbıdır: "set to zero".',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u2-d3-a5',
              soru: "Which sentence is the passive form of 'The interrupt handler updates the counter'?",
              secenekler: [
                'The counter updates the interrupt handler.',
                'The counter is updating by the interrupt handler.',
                'The counter is updated by the interrupt handler.',
              ],
              dogru: 2,
              aciklama:
                'Nesne (the counter) özne olur, fiil "is + V3" olur, işi yapan "by" ile eklenir: "is updated by". "The counter updates the interrupt handler" anlamı tersine çevirir; "is updating by" cümlesinde V3 yok.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u2-d3-a6',
              cumle: 'The value is stored in a local variable.',
              anlam: 'Değer yerel bir değişkende saklanır.',
              celdiriciler: ['store', 'global', 'on'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u2-d3-a7',
              cumle: 'This function is called every ten milliseconds.',
              anlam: 'Bu fonksiyon her on milisaniyede bir çağrılır.',
              celdiriciler: ['calls', 'seconds', 'each'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u2-d3-a8',
              cumle: 'The data is sent to the server over a socket.',
              anlam: 'Veri sunucuya bir soket üzerinden gönderilir.',
              ipucu:
                'data: Amerikan aksanında /ˈdeɪtə/ "DEY-dı"; ortadaki t yumuşar. server: "SÖR-vır".',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u2-d3-a9',
              kaynak: 'Sonuç bir değişkende saklanır.',
              cevaplar: [
                'The result is stored in a variable.',
                'The result is saved in a variable.',
                'The result is kept in a variable.',
                'The result gets stored in a variable.',
                'The result is held in a variable.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u2-d3-a10',
              kaynak: 'Bu fonksiyon her saniye çağrılır.',
              cevaplar: [
                'This function is called every second.',
                'This function gets called every second.',
                'This function is invoked every second.',
                'This function is called once per second.',
                'This function is called once a second.',
              ],
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u2-d3-a11',
              metin: `onPacket(callback)

Registers a callback. The callback is called once for every packet that is received. The packet is passed to the callback as a byte array.`,
              soru: 'According to the text, what is passed to the callback?',
              secenekler: [
                'The number of received packets.',
                'The packet, as a byte array.',
                'A new callback function.',
              ],
              dogru: 1,
              aciklama:
                '"The packet is passed to the callback as a byte array" cümlesi bunu doğrudan söyler: callback’e paketin kendisi bayt dizisi olarak aktarılır.',
            },
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────── ÜNİTE 3 — B1
    {
      id: 'yazilim-u3',
      seviye: 'B1',
      gorsel: '🐞',
      baslik: 'Hatalar ve hata ayıklama',
      ozet: 'Hata mesajlarını okumak, stack trace’i yorumlamak, kök nedeni ve geçici çözümü anlatmak.',
      dersler: [
        {
          id: 'yazilim-u3-d1',
          baslik: 'Hata mesajlarını okumak',
          gorsel: '🚨',
          not: `Hata mesajları kısa ve kalıplıdır; birkaç kalıbı tanıyınca çoğunu anında anlarsınız.

- **undefined is not a function**: çağırmaya çalıştığınız şey bir fonksiyon değil (çoğu zaman tanımsız)
- **permission denied**: erişim izni yok (dosya, port, klasör)
- **out of memory**: bellek tükendi
- **timeout / timed out**: zaman aşımı, yanıt zamanında gelmedi
- **not found**: bulunamadı; **warning**: uyarı (derleme yine de sürer); **error**: hata
- **crash**: programın çökmesi; **throw an error**: hata fırlatmak

**Kalıp:** "I get a ... error when I ..." / "The request timed out after ... seconds."

- I get a permission denied error when I open the serial port. — Seri portu açınca "permission denied" hatası alıyorum.
- The request timed out after thirty seconds. — İstek otuz saniye sonra zaman aşımına uğradı.
- The app crashes when the sensor is disconnected. — Sensör çıkarılınca uygulama çöküyor.
- It throws a TypeError. — Bir TypeError fırlatıyor.

**Sık yapılan hata:** "hata almak" → "take an error" ❌. Doğrusu "get an error" ✅ ya da "I'm getting an error" ✅. "It gives error" yerine de "it throws an error" ya da "it fails with an error" deyin.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u3-d1-a1',
              ciftler: [
                ['error message', 'hata mesajı'],
                ['permission denied', 'erişim reddedildi'],
                ['out of memory', 'bellek tükendi'],
                ['timeout', 'zaman aşımı'],
                ['warning', 'uyarı'],
                ['crash', 'çökme'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d1-a2',
              soru: "I ___ a 'permission denied' error when I run the script.",
              secenekler: ['take', 'make', 'get'],
              dogru: 2,
              aciklama:
                'İngilizcede hata "alınmaz", "get" edilir: "I get an error". "Take an error" Türkçeden birebir çeviridir ve yanlıştır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d1-a3',
              soru: 'The request ___ out after thirty seconds.',
              secenekler: ['timed', 'ran', 'took'],
              dogru: 0,
              aciklama:
                '"Time out" zaman aşımına uğramaktır: "the request timed out". "Run out" bir şeyin tükenmesidir (run out of memory).',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d1-a4',
              soru: 'This is only a ___, not an error; the build still succeeds.',
              secenekler: ['crash', 'warning', 'timeout'],
              dogru: 1,
              aciklama:
                'Uyarı (warning) olası bir soruna dikkat çeker ama derlemeyi durdurmaz. Error ise derlemeyi başarısız kılar.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u3-d1-a5',
              metin: 'TypeError: sensor.read is not a function',
              soru: 'What does this error most likely mean?',
              secenekler: [
                'sensor.read is not something you can call; it may be undefined.',
                'The sensor returned a wrong value.',
                'The program has no permission to read the sensor.',
              ],
              dogru: 0,
              aciklama:
                'Kod sensor.read() diye çağırmaya çalışmış ama sensor.read bir fonksiyon değil; genellikle tanımsızdır ya da yanlış yazılmıştır. Sensörün değeri ya da izinle ilgili değildir.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u3-d1-a6',
              metin: `[telemetry] buffering 2048 frames...
fatal: allocation failed (requested 512 MB): out of memory
process exited with code 1`,
              soru: 'What is the problem?',
              secenekler: [
                'The disk is full.',
                'The network connection was lost.',
                'The program tried to use more memory than was available.',
              ],
              dogru: 2,
              aciklama:
                '"Allocation failed ... out of memory": bellek ayırma isteği karşılanamadı, yani RAM yetmedi. Disk ya da ağdan söz edilmiyor.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u3-d1-a7',
              cumle: 'I get a permission denied error when I run the script.',
              anlam: 'Betiği çalıştırınca "permission denied" hatası alıyorum.',
              celdiriciler: ['take', 'permissions', 'runs'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u3-d1-a8',
              cumle: 'The request timed out after thirty seconds.',
              anlam: 'İstek otuz saniye sonra zaman aşımına uğradı.',
              celdiriciler: ['time', 'before', 'second'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u3-d1-a9',
              cumle: 'The app crashes when the sensor is disconnected.',
              anlam: 'Sensörün bağlantısı kesilince uygulama çöküyor.',
              ipucu:
                'crashes: "KRE-şız". disconnected: vurgu "NEK" hecesinde, "dis-kı-NEK-tıd"; -ed burada "ıd" diye okunur.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u3-d1-a10',
              kaynak: 'Betiği çalıştırınca bir hata alıyorum.',
              cevaplar: [
                'I get an error when I run the script.',
                'I am getting an error when I run the script.',
                'When I run the script, I get an error.',
                'When I run the script, I am getting an error.',
                'I get an error when running the script.',
                'I am getting an error when running the script.',
                'I get an error when I execute the script.',
                'I get an error whenever I run the script.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u3-d1-a11',
              kaynak: 'Program belleği tükendiği için çöktü.',
              cevaplar: [
                'The program crashed because it ran out of memory.',
                'The program crashed because it was out of memory.',
                'The program crashed due to an out of memory error.',
                'The program crashed due to an out-of-memory error.',
                'The program crashed because of an out of memory error.',
                'The program crashed because of an out-of-memory error.',
                'The program crashed due to insufficient memory.',
                'The program crashed because it had run out of memory.',
                'The program crashed because there was not enough memory.',
              ],
            },
          ],
        },
        {
          id: 'yazilim-u3-d2',
          baslik: 'Stack trace ve hata ayıklama',
          gorsel: '🔍',
          not: `Hata ayıklarken (debugging) en çok kullanılan kelimeler:

- **stack trace**: hata anındaki çağrı zinciri (yığın izi)
- **reproduce**: hatayı yeniden oluşturmak; **steps to reproduce**: yeniden oluşturma adımları
- **breakpoint**: kesme noktası; **step through**: kodu adım adım ilerletmek
- **logging**: günlük kaydı tutmak; **logs**: kayıtlar
- **intermittent**: ara sıra ortaya çıkan, kalıcı olmayan

**Kalıp:** Python’daki "Traceback (most recent call last)" ifadesi, en son çağrının EN ALTTA olduğunu söyler: hatanın oluştuğu yer en alttaki dosya/satır kaydıdır, en son satır ise hatanın türü ve mesajıdır.

- I can reproduce the bug on my laptop. — Hatayı dizüstü bilgisayarımda yeniden oluşturabiliyorum.
- I can't reproduce it locally. — Kendi makinemde oluşturamıyorum.
- Set a breakpoint on line forty-two. — Kırk ikinci satıra kesme noktası koy.
- The stack trace points to the motor module. — Stack trace motor modülünü gösteriyor.

**Sık yapılan hata:** "I am making debug" ❌. "Debug" bir fiildir: "I'm debugging the parser" ✅. Benzer şekilde "do a research" ❌ yerine "do some research" ✅; "research" sayılamaz.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u3-d2-a1',
              ciftler: [
                ['stack trace', 'yığın izi (çağrı zinciri)'],
                ['breakpoint', 'kesme noktası'],
                ['reproduce', 'yeniden oluşturmak'],
                ['step through', 'adım adım ilerletmek'],
                ['intermittent', 'ara sıra ortaya çıkan'],
                ['debugger', 'hata ayıklayıcı'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d2-a2',
              soru: "I can't ___ the bug on my machine; it only happens on the test server.",
              secenekler: ['produce', 'reproduce', 'repeat to'],
              dogru: 1,
              aciklama:
                'Bir hatayı bilerek yeniden ortaya çıkarmak "reproduce" fiiliyle söylenir. "Produce" yalnızca üretmek demektir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d2-a3',
              soru: 'Set a ___ on line 42 and step through the loop.',
              secenekler: ['breakpoint', 'stack trace', 'timeout'],
              dogru: 0,
              aciklama:
                'Programı belirli bir satırda durdurmak için kesme noktası (breakpoint) konur; ardından kod adım adım ilerletilir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d2-a4',
              soru: "I'm ___ the parser right now.",
              secenekler: ['making debug', 'doing debug', 'debugging'],
              dogru: 2,
              aciklama:
                '"Debug" doğrudan fiil olarak kullanılır: "I’m debugging". "Make/do debug" yanlıştır.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u3-d2-a5',
              metin: `Traceback (most recent call last):
  File "main.py", line 8, in <module>
    start()
  File "motor.py", line 21, in start
    speed = config["max_speed"]
KeyError: 'max_speed'`,
              soru: 'Where was the error actually raised?',
              secenekler: [
                'main.py, line 8',
                'motor.py, line 21, in start()',
                'In the config file on disk',
              ],
              dogru: 1,
              aciklama:
                '"Most recent call last": en son çağrı en altta. Hata motor.py’nin 21. satırında, config sözlüğünde "max_speed" anahtarı olmadığı için oluştu. main.py yalnızca start()’ı çağırdı.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u3-d2-a6',
              cumle: 'I can reproduce the bug on my laptop.',
              anlam: 'Hatayı dizüstü bilgisayarımda yeniden oluşturabiliyorum.',
              celdiriciler: ['produce', 'in', 'bag'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u3-d2-a7',
              cumle: 'The stack trace points to the motor module.',
              anlam: 'Stack trace motor modülünü gösteriyor.',
              celdiriciler: ['shows', 'track', 'model'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u3-d2-a8',
              cumle: 'Let me add some logging and try again.',
              anlam: 'Biraz kayıt (log) ekleyip tekrar deneyeyim.',
              ipucu:
                'logging: Amerikan aksanında /ˈlɑːɡɪŋ/ "LAA-ging"; "o" açık "a"ya yakın okunur.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u3-d2-a9',
              kaynak: 'Hatayı kendi makinemde yeniden oluşturamıyorum.',
              cevaplar: [
                'I cannot reproduce the bug on my machine.',
                'I cannot reproduce the bug on my own machine.',
                'I cannot reproduce the error on my machine.',
                'I cannot reproduce the issue on my machine.',
                'I am unable to reproduce the bug on my machine.',
                'I cannot reproduce the bug locally.',
                'I cannot reproduce the bug on my computer.',
                'I cannot reproduce the issue locally.',
                'I cannot reproduce the error locally.',
                'I am not able to reproduce the bug on my machine.',
                'I am unable to reproduce the issue on my machine.',
                'I cannot reproduce the issue on my own machine.',
                'I cannot reproduce the error on my own machine.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u3-d2-a10',
              kaynak: 'Hata yalnızca ara sıra oluyor.',
              cevaplar: [
                'The bug only happens occasionally.',
                'The bug happens only occasionally.',
                'The bug only occurs occasionally.',
                'The bug occurs only occasionally.',
                'The bug only happens sometimes.',
                'The error only happens occasionally.',
                'The error happens only occasionally.',
                'The error only occurs occasionally.',
                'The issue only happens occasionally.',
                'The issue happens only occasionally.',
                'The issue only occurs occasionally.',
                'The issue occurs only occasionally.',
                'The bug happens only sometimes.',
                'The error only happens sometimes.',
                'The issue only happens sometimes.',
                'The bug is intermittent.',
                'The error is intermittent.',
                'The issue is intermittent.',
              ],
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u3-d2-a11',
              soru: "A teammate says: 'It's intermittent, maybe one run in ten.' What does that mean?",
              secenekler: [
                'The bug happens every time.',
                'The bug has already been fixed.',
                'The bug happens only some of the time.',
              ],
              dogru: 2,
              aciklama:
                'Intermittent = ara sıra, düzensiz. "One run in ten" (on denemede bir) da bunu doğrular. Bu tür hataları yeniden oluşturmak zordur.',
            },
          ],
        },
        {
          id: 'yazilim-u3-d3',
          baslik: 'Kök neden, geçici çözüm ve düzeltme',
          gorsel: '🩹',
          not: `Hata bulunduktan sonra konuşulan dil:

- **root cause**: kök neden (asıl sebep)
- **workaround**: geçici çözüm (sorunu çözmez, etrafından dolaşır)
- **fix**: düzeltme; **patch**: yama
- **regression**: gerileme; önceden çalışan bir özelliğin yeni bir değişiklikle bozulması
- **edge case**: uç durum (boş liste, sıfır, çok büyük değer)
- **race condition**: yarış durumu; sonucun iş parçacıklarının çalışma sırasına bağlı olması (ör. iki iş parçacığının aynı veriye korumasız, eşzamanlı erişmesi)
- **side effect**: yan etki

**Kalıp:** "The root cause was ... As a workaround, ... The fix is ..."

- The root cause was a race condition in the driver. — Kök neden sürücüdeki bir yarış durumuydu.
- As a workaround, you can restart the board. — Geçici çözüm olarak kartı yeniden başlatabilirsiniz.
- This change introduced a regression. — Bu değişiklik bir gerilemeye yol açtı.
- We need to handle the edge case where the list is empty. — Listenin boş olduğu uç durumu ele almalıyız.

**Sık yapılan hata:** "the reason of the crash" ❌ → "the reason for the crash" ✅ ya da "the cause of the crash" ✅. Hata için "solve the bug" yerine doğal eşdizim "fix the bug" ✅.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u3-d3-a1',
              ciftler: [
                ['root cause', 'kök neden'],
                ['workaround', 'geçici çözüm'],
                ['regression', 'gerileme (çalışan şeyin bozulması)'],
                ['edge case', 'uç durum'],
                ['side effect', 'yan etki'],
                ['race condition', 'yarış durumu'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d3-a2',
              soru: 'Restarting the board is only a ___; we still need to find the root cause.',
              secenekler: ['regression', 'workaround', 'root cause'],
              dogru: 1,
              aciklama:
                'Sorunu çözmeden etkisini geçici olarak ortadan kaldıran şey workaround’dur. "Only a ... ; we still need ..." yapısı bunun kalıcı olmadığını gösterir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d3-a3',
              soru: 'The ___ of the crash was a null pointer in the CAN driver.',
              secenekler: ['root cause', 'workaround', 'side effect'],
              dogru: 0,
              aciklama:
                'Çökmenin asıl sebebi kök nedendir (root cause). Workaround çözüm, side effect yan etkidir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d3-a4',
              soru: 'This change ___ the bug, but it introduced a regression in the logger.',
              secenekler: ['cured', 'fixed', 'repaired'],
              dogru: 1,
              aciklama:
                'Hata (bug) için doğal eşdizim "fix"tir. "Repair" fiziksel şeyler (a broken cable), "cure" hastalıklar için kullanılır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u3-d3-a5',
              soru: 'What is the reason ___ this timeout?',
              secenekler: ['of', 'about', 'for'],
              dogru: 2,
              aciklama:
                '"Reason" isminden sonra "for" gelir: "the reason for the timeout". "Cause" ise "of" alır: "the cause of the timeout".',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u3-d3-a6',
              metin: `Incident summary: The telemetry service stopped sending data for 12 minutes.
Root cause: Two threads wrote to the same buffer at the same time.
Workaround: The service was restarted manually.
Fix: The buffer is now protected by a mutex (PR #214).`,
              soru: 'What kind of bug was it?',
              secenekler: ['An off-by-one error', 'A race condition', 'A permission problem'],
              dogru: 1,
              aciklama:
                'İki iş parçacığının aynı tampona aynı anda yazması klasik bir yarış durumudur (race condition). Mutex de tam olarak bunu önlemek için kullanılır.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u3-d3-a7',
              cumle: 'The root cause was a race condition in the driver.',
              anlam: 'Kök neden sürücüdeki bir yarış durumuydu.',
              celdiriciler: ['route', 'reason', 'rice'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u3-d3-a8',
              cumle: 'As a workaround, you can restart the board.',
              anlam: 'Geçici çözüm olarak kartı yeniden başlatabilirsin.',
              celdiriciler: ['around', 'walk', 'boat'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u3-d3-a9',
              cumle: "This fix might introduce a regression, so let's add a test.",
              anlam: 'Bu düzeltme bir gerilemeye yol açabilir, o yüzden bir test ekleyelim.',
              ipucu: 'regression: "ri-GRE-şın", vurgu ikinci hecede. introduce: "in-trı-DUUS".',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u3-d3-a10',
              kaynak: 'Kök neden sürücüdeki bir yarış durumuydu.',
              cevaplar: [
                'The root cause was a race condition in the driver.',
                'The root cause was a race condition in the device driver.',
                'The root cause was a driver race condition.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u3-d3-a11',
              kaynak: 'Bu geçici bir çözüm, kalıcı bir düzeltme değil.',
              cevaplar: [
                'This is a workaround, not a permanent fix.',
                'This is a temporary workaround, not a permanent fix.',
                'This is a temporary fix, not a permanent one.',
                'This is a temporary solution, not a permanent fix.',
                'This is a workaround, not a real fix.',
                'This is a workaround rather than a permanent fix.',
                'It is a workaround, not a permanent fix.',
                'This is a workaround, not a permanent solution.',
                'This is a temporary workaround, not a permanent solution.',
                'This is a temporary solution, not a permanent one.',
              ],
            },
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────── ÜNİTE 4 — B1
    {
      id: 'yazilim-u4',
      seviye: 'B1',
      gorsel: '🔀',
      baslik: 'Sürüm kontrolü ve ekip çalışması',
      ozet: 'Git terimleri, emir kipinde commit mesajı yazmak ve kibar kod incelemesi yorumları.',
      dersler: [
        {
          id: 'yazilim-u4-d1',
          baslik: 'Git’in dili',
          gorsel: '🌿',
          not: `Ekipte her gün kullanılan Git kelimeleri:

- **repository (repo)**: depo
- **commit**: kayıt (isim) ve kaydetmek (fiil)
- **branch**: dal; **main**: ana dal
- **push**: yerel commit’leri uzak depoya göndermek
- **pull**: uzak depodaki değişiklikleri çekmek
- **clone**: deponun kopyasını indirmek
- **merge**: birleştirmek; **merge conflict**: birleştirme çakışması
- **pull request (PR)**: değişikliğin incelenip birleştirilmesi için açılan istek

**Kalıp:** "merge X **into** main", "push **to** the branch", "pull **from** main", "resolve a merge conflict"

- Pull the latest changes from main. — main’deki son değişiklikleri çek.
- I pushed my changes to the feature branch. — Değişikliklerimi özellik dalına gönderdim.
- I resolved the merge conflict. — Birleştirme çakışmasını çözdüm.
- Please open a pull request. — Lütfen bir pull request aç.

**Sık yapılan hata:** "merge to main" konuşmada duyulur ama yazıda doğru edat **into**’dur. Bir de yön karışıklığı: push = benden uzağa (göndermek), pull = bana doğru (çekmek).`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u4-d1-a1',
              ciftler: [
                ['repository', 'depo'],
                ['branch', 'dal'],
                ['merge conflict', 'birleştirme çakışması'],
                ['push', 'uzak depoya göndermek'],
                ['pull', 'uzak depodan çekmek'],
                ['clone', 'deponun kopyasını indirmek'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u4-d1-a2',
              soru: 'Before you start, ___ the latest changes from main.',
              secenekler: ['push', 'pull', 'commit'],
              dogru: 1,
              aciklama:
                'Uzak depodaki değişiklikleri kendinize almak "pull"dur. Push ters yöndür: sizden uzak depoya.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u4-d1-a3',
              soru: 'Merge the feature branch ___ main after the review.',
              secenekler: ['into', 'onto', 'inside'],
              dogru: 0,
              aciklama:
                'Bir dalı diğerine birleştirmek "merge X into Y" kalıbıdır. "Onto" daha çok rebase ile kullanılır: "rebase onto main".',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u4-d1-a4',
              soru: "Git couldn't merge automatically, so I had to resolve a merge ___.",
              secenekler: ['crash', 'collision', 'conflict'],
              dogru: 2,
              aciklama:
                'Aynı satırlar iki dalda farklı değiştiyse merge conflict oluşur ve elle çözülür (resolve). Git bu durum için "collision" ya da "crash" kelimesini kullanmaz.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u4-d1-a5',
              soru: 'Which command sends your local commits to the remote repository?',
              secenekler: ['git pull', 'git push', 'git clone'],
              dogru: 1,
              aciklama:
                'git push yerel commit’leri uzak depoya gönderir. git pull uzak değişiklikleri çeker, git clone deponun kopyasını ilk kez indirir.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u4-d1-a6',
              cumle: 'I pushed my changes to the feature branch.',
              anlam: 'Değişikliklerimi özellik dalına gönderdim.',
              celdiriciler: ['pulled', 'change', 'brunch'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u4-d1-a7',
              cumle: 'Please open a pull request when you are ready.',
              anlam: 'Hazır olduğunda lütfen bir pull request aç.',
              celdiriciler: ['push', 'make', 'requests'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u4-d1-a8',
              cumle: 'I resolved the merge conflict and pushed again.',
              anlam: 'Birleştirme çakışmasını çözdüm ve tekrar gönderdim.',
              ipucu:
                'pushed: tek hece, /pʊʃt/: "push" ve sonuna yalnızca bir "t"; "pu-şed" diye okunmaz. resolved: Amerikan aksanında "ri-ZAALVD", sondaki -ed "d" gibi okunur.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u4-d1-a9',
              kaynak: 'Değişikliklerimi uzak depoya gönderdim.',
              cevaplar: [
                'I pushed my changes to the remote repository.',
                'I pushed my changes to the remote repo.',
                'I pushed my changes to the remote.',
                'I have pushed my changes to the remote repository.',
                'I have pushed my changes to the remote.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u4-d1-a10',
              kaynak: 'Bu dalı ana dala birleştir.',
              cevaplar: [
                'Merge this branch into main.',
                'Merge this branch into the main branch.',
                'Merge this branch to main.',
                'Merge this branch into master.',
                'Merge this branch into the master branch.',
              ],
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u4-d1-a11',
              metin: `$ git status
On branch feature/brake-sensor
Your branch is ahead of 'origin/feature/brake-sensor' by 2 commits.
nothing to commit, working tree clean`,
              soru: 'What should you do to share your work with the team?',
              secenekler: [
                'Pull two commits from the remote.',
                'Delete the branch and clone the repository again.',
                'Push your two local commits.',
              ],
              dogru: 2,
              aciklama:
                '"Ahead of ... by 2 commits": yerelde uzak depoda olmayan iki commit var. Paylaşmak için push edilmelidir. "Behind" yazsaydı pull gerekirdi.',
            },
          ],
        },
        {
          id: 'yazilim-u4-d2',
          baslik: 'Commit mesajı yazmak',
          gorsel: '✍️',
          not: `İyi bir commit başlığı **emir kipiyle (imperative mood)** yazılır, büyük harfle başlar, sonuna nokta konmaz ve yaklaşık 50 karakteri geçmez. Gövdede (body) NEDEN değiştirildiği anlatılır.

**Test cümlesi:** "If applied, this commit will ___." Boşluğa başlığınız uymalı: "If applied, this commit will **fix the crash when the IMU is disconnected**."

**Sık fiiller**
- **add**: eklemek; **remove**: kaldırmak; **fix**: düzeltmek
- **update**: güncellemek; **rename**: yeniden adlandırmak
- **refactor**: davranışı değiştirmeden kodu yeniden düzenlemek
- **revert**: önceki bir commit’i geri almak; **bump**: sürüm numarasını yükseltmek

**Örnekler**
- Add retry logic to the CAN driver — CAN sürücüsüne yeniden deneme mantığı ekle
- Fix off-by-one error in ring buffer — Halka tampondaki off-by-one (bir fazla/bir eksik) hatasını düzelt
- Remove unused imports — Kullanılmayan içe aktarmaları kaldır
- Bump firmware version to 2.4.1 — Ürün yazılımı sürümünü 2.4.1’e yükselt

**Not:** Conventional Commits kullanan ekiplerde başlık tür önekiyle ve küçük harfle yazılır: "fix(brake): clamp PWM duty cycle". Emir kipi kuralı orada da geçerlidir.

**Sık yapılan hata:** Başlıkta geçmiş zaman ya da -ing: "Added ...", "Fixing ..." ❌. "Fixed some stuff" gibi belirsiz başlıklar da kötüdür: ne değişti, nerede?`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u4-d2-a1',
              ciftler: [
                ['refactor', 'davranışı değiştirmeden yeniden düzenlemek'],
                ['revert', 'geri almak'],
                ['rename', 'yeniden adlandırmak'],
                ['bump', 'sürümü yükseltmek'],
                ['remove', 'kaldırmak'],
                ['unused', 'kullanılmayan'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u4-d2-a2',
              soru: 'Commit subject: "___ timeout handling to the CAN driver"',
              secenekler: ['Added', 'Adding', 'Add'],
              dogru: 2,
              aciklama:
                'Commit başlığı emir kipiyle yazılır: "Add ...". "If applied, this commit will add timeout handling" testi de bunu doğrular.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u4-d2-a3',
              soru: 'If applied, this commit will ___ the off-by-one error in the ring buffer.',
              secenekler: ['fix', 'fixes', 'fixed'],
              dogru: 0,
              aciklama:
                '"Will"den sonra fiil yalın halde gelir: "will fix". Commit başlığı da tam bu yalın haldir.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u4-d2-a4',
              soru: 'Which is the best commit subject line?',
              secenekler: [
                'fixed some stuff',
                'Fix crash when IMU is disconnected',
                'Fixing the crash that happened yesterday when Ali unplugged the IMU during the test.',
              ],
              dogru: 1,
              aciklama:
                '"Fix crash when IMU is disconnected" kısa, emir kipinde ve neyin düzeltildiğini söylüyor. "fixed some stuff" belirsiz ve geçmiş zamanda; "Fixing the crash…" çok uzun, -ing’li ve noktayla bitiyor. Ayrıntılar gövdeye yazılır.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u4-d2-a5',
              soru: "What does 'refactor' mean in a commit message?",
              secenekler: [
                'Add a new feature for users.',
                'Delete the repository history.',
                'Change the structure of the code without changing its behavior.',
              ],
              dogru: 2,
              aciklama:
                'Refactor, kodun dışarıdan görünen davranışını değiştirmeden iç yapısını iyileştirmektir: fonksiyonu bölmek, ad değiştirmek, tekrarı kaldırmak gibi.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u4-d2-a6',
              cumle: 'Remove unused imports from the main module.',
              anlam: 'Ana modüldeki kullanılmayan içe aktarmaları kaldır.',
              celdiriciler: ['removed', 'used', 'model'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u4-d2-a7',
              cumle: 'Revert the last commit because it broke the build.',
              anlam: 'Son commit’i geri al, çünkü derlemeyi bozdu.',
              celdiriciler: ['reverse', 'breaks', 'built'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u4-d2-a8',
              cumle: "I'll squash these commits before merging.",
              anlam: 'Birleştirmeden önce bu commit’leri tek commit’te toplayacağım.',
              ipucu:
                'squash: /skwɑːʃ/ "skuaaş". "Squash commits" = birden fazla commit’i tek commit’e indirmek.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u4-d2-a9',
              kaynak: 'Commit başlığı yaz: Sensör sürücüsüne yeniden deneme mantığı ekle',
              cevaplar: [
                'Add retry logic to the sensor driver',
                'Add retry logic to sensor driver',
                'Add retry mechanism to the sensor driver',
                'Add retry mechanism to sensor driver',
                'Add retry support to the sensor driver',
                'Add retries to the sensor driver',
                'Add retry support to sensor driver',
                'Add retries to sensor driver',
              ],
              aciklama: 'Commit başlığı emir kipindedir ve sonunda nokta yoktur.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u4-d2-a10',
              kaynak: 'Commit başlığı yaz: Kullanılmayan değişkenleri kaldır',
              cevaplar: [
                'Remove unused variables',
                'Remove the unused variables',
                'Delete unused variables',
                'Delete the unused variables',
              ],
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u4-d2-a11',
              metin: `fix(brake): clamp PWM duty cycle to 0-100%

The controller could send values above 100% when the
setpoint changed quickly, which caused the motor driver
to fault. Clamp the output and add a unit test for this
edge case.`,
              soru: 'What does the body of this commit message explain?',
              secenekler: [
                'Why the change was needed and what was done.',
                'Who reviewed the change.',
                'Which files were renamed.',
              ],
              dogru: 0,
              aciklama:
                'Gövde sorunu (hızlı setpoint değişiminde %100’ü aşan değer, sürücünün hataya düşmesi) ve çözümü (çıkışı sınırlamak, test eklemek) anlatıyor. İyi bir commit gövdesi tam olarak bunu yapar.',
            },
          ],
        },
        {
          id: 'yazilim-u4-d3',
          baslik: 'Kod incelemesi yorumları',
          gorsel: '👀',
          not: `Kod incelemesinde (code review) ton çok önemlidir: yorum koda yapılır, kişiye değil.

- **LGTM** (looks good to me): bence uygun, onay
- **nit** (nitpick): küçük, önemsiz öneri; birleştirmeyi engellemez
- **blocking / non-blocking**: birleştirmeyi engelleyen / engellemeyen
- **approve**: onaylamak; **request changes**: değişiklik istemek
- **address a comment**: yorumun gereğini yapmak
- **PTAL** (please take another look): lütfen tekrar bakar mısın

**Kibar kalıplar**
- Could you add a test for this edge case? — Bu uç durum için test ekleyebilir misin?
- Would it make sense to cache this value? — Bu değeri önbelleğe almak mantıklı olur mu?
- I'm not sure this handles the timeout correctly. — Bunun zaman aşımını doğru ele aldığından emin değilim.
- nit: extra blank line here. — Küçük not: burada fazladan boş satır var.

**Sık yapılan hata:** Türkçedeki doğrudan emir İngilizcede kaba duyulur: "Change this." yerine "Could you change this?" ✅. Bir de "I fixed your comments" ❌: yorum düzeltilmez, gereği yapılır: "I addressed your comments" ✅.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u4-d3-a1',
              ciftler: [
                ['LGTM', 'bence uygun (onay)'],
                ['nit', 'küçük, önemsiz öneri'],
                ['approve', 'onaylamak'],
                ['request changes', 'değişiklik istemek'],
                ['address a comment', 'yorumun gereğini yapmak'],
                ['blocking', 'birleştirmeyi engelleyen'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u4-d3-a2',
              soru: '___: extra blank line here. Not blocking.',
              secenekler: ['Nit', 'LGTM', 'Blocker'],
              dogru: 0,
              aciklama:
                'Küçük biçim önerileri "nit:" ile başlar ve birleştirmeyi engellemez. LGTM onaydır; "Blocker" ise "Not blocking" ile çelişir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u4-d3-a3',
              soru: "Thanks for the review! I've ___ all your comments.",
              secenekler: ['repaired', 'addressed', 'answered to'],
              dogru: 1,
              aciklama:
                'Yorumların gereğini yapmak "address comments" diye söylenir. "Answer" geçişli fiildir, "to" almaz; "repair" fiziksel onarım içindir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u4-d3-a4',
              soru: '___ it make sense to cache this value instead of reading it every time?',
              secenekler: ['Is', 'Has', 'Would'],
              dogru: 2,
              aciklama:
                '"Would it make sense to ...?" kibar bir öneri kalıbıdır. "Make" bir fiil olduğundan "Is" ya da "Has" ile soru kurulamaz.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u4-d3-a5',
              soru: 'Which comment is the most polite and professional?',
              secenekler: [
                'Extract this into a helper function now.',
                'Could you extract this into a helper function?',
                'This is wrong, rewrite it.',
              ],
              dogru: 1,
              aciklama:
                '"Could you ...?" isteği soru biçiminde ve kibar yapar. Diğer ikisi emir gibi duyulur ve kişiyi hedef alır.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u4-d3-a6',
              cumle: 'Looks good to me, just one small nit.',
              anlam: 'Bence uygun, sadece küçük bir not var.',
              celdiriciler: ['look', 'night', 'big'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u4-d3-a7',
              cumle: 'Could you add a test for this edge case?',
              anlam: 'Bu uç durum için bir test ekleyebilir misin?',
              celdiriciler: ['can', 'adds', 'age'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u4-d3-a8',
              cumle: "I'm not sure this handles the timeout correctly.",
              anlam: 'Bunun zaman aşımını doğru ele aldığından emin değilim.',
              ipucu:
                'handles: "HEN-dılz"; "d" çok hafif. correctly: "kı-REKT-li", vurgu ikinci hecede.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u4-d3-a9',
              kaynak: 'Tüm yorumlarının gereğini yaptım.',
              cevaplar: [
                'I addressed all your comments.',
                'I have addressed all your comments.',
                'I addressed all of your comments.',
                'I have addressed all of your comments.',
              ],
              aciklama: 'Yorumlar "fix" edilmez, "address" edilir.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u4-d3-a10',
              kaynak: 'Bu sadece küçük bir öneri.',
              cevaplar: [
                'This is just a small suggestion.',
                'This is just a minor suggestion.',
                'This is only a small suggestion.',
                'This is only a minor suggestion.',
                'It is just a small suggestion.',
                'It is just a minor suggestion.',
                'It is only a small suggestion.',
                'It is only a minor suggestion.',
                'Just a small suggestion.',
                'Just a minor suggestion.',
                'This is just a nit.',
                'Just a nit.',
              ],
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u4-d3-a11',
              metin: `nit: maxSpeed should be MAX_SPEED since it's a constant.

This loop can run forever if the sensor never responds. Could you add a timeout?

Otherwise LGTM.`,
              soru: 'Which comment must be addressed before merging?',
              secenekler: [
                'Renaming maxSpeed to MAX_SPEED',
                'Adding a timeout to the loop',
                'Nothing; the reviewer has already approved everything',
              ],
              dogru: 1,
              aciklama:
                'Sonsuz döngü gerçek bir hatadır, bu yüzden engelleyicidir. "nit:" ile başlayan ad değişikliği isteğe bağlıdır. "Otherwise LGTM" = "bunun dışında uygun", yani onay timeout eklenmesine bağlıdır.',
            },
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────── ÜNİTE 5 — B2
    {
      id: 'yazilim-u5',
      seviye: 'B2',
      gorsel: '📄',
      baslik: 'Dokümantasyon ve API referansları',
      ozet: 'API belgesi, fonksiyon referansı ve MUST/SHOULD/MAY gibi şartname dilini doğru okumak.',
      dersler: [
        {
          id: 'yazilim-u5-d1',
          baslik: 'Uç noktalar, istekler ve yanıtlar',
          gorsel: '🌐',
          not: `Bir web API belgesi hemen hep aynı başlıklardan oluşur.

- **endpoint**: uç nokta (GET /v1/runs gibi bir adres + yöntem)
- **request / response**: istek / yanıt; **request body**: istek gövdesi
- **header**: HTTP başlığı (Authorization, Content-Type)
- **query parameter**: adresteki ?limit=20 gibi parametre; **path parameter**: /runs/{id} içindeki id
- **required / optional**: zorunlu / isteğe bağlı
- **defaults to**: varsayılan değeri ...’dir
- **status code**: durum kodu; **rate limit**: belirli sürede izin verilen istek sayısı

**Kalıp:** "limit (integer, optional): Maximum number of results. Defaults to 20."

- Send a GET request to the runs endpoint. — runs uç noktasına bir GET isteği gönder.
- This parameter is optional and defaults to ten. — Bu parametre isteğe bağlıdır, varsayılanı ondur.
- The response body contains a JSON object. — Yanıt gövdesi bir JSON nesnesi içerir.
- We hit the rate limit. — İstek sınırına takıldık.

**Sık yapılan hata:** "default is to 20" ya da "defaults with 20" ❌ → "defaults to 20" ✅ ya da "the default is 20" ✅. "Bir bilgi" için de "an information" ❌ → "a piece of information" ✅.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u5-d1-a1',
              ciftler: [
                ['endpoint', 'uç nokta'],
                ['request body', 'istek gövdesi'],
                ['response', 'yanıt'],
                ['header', 'HTTP başlığı'],
                ['status code', 'durum kodu'],
                ['rate limit', 'istek sınırı'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u5-d1-a2',
              soru: "The 'limit' parameter is optional and ___ 20.",
              secenekler: ['defaults with', 'defaults to', 'is default'],
              dogru: 1,
              aciklama:
                'Belgelerdeki sabit kalıp "defaults to + değer"dir. Alternatif olarak "the default is 20" denebilir; "defaults with" ve "is default" yanlıştır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u5-d1-a3',
              soru: 'If you omit a ___ parameter, the server returns 400 Bad Request.',
              secenekler: ['required', 'optional', 'default'],
              dogru: 0,
              aciklama:
                'Gönderilmediğinde hata dönen parametre zorunludur (required). İsteğe bağlı (optional) bir parametre atlanırsa varsayılan değer kullanılır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u5-d1-a4',
              soru: 'The ___ contains the data you send, usually as JSON.',
              secenekler: ['status code', 'header', 'request body'],
              dogru: 2,
              aciklama:
                'Gönderilen asıl veri istek gövdesindedir (request body). Header’lar üst bilgi taşır (kimlik doğrulama, içerik türü), status code ise yanıtta gelir.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u5-d1-a5',
              metin: `GET /v1/runs/{id}
Returns a single test run.

Path parameters
  id (string, required) - The run ID.

Query parameters
  include_samples (boolean, optional) - Include raw sensor samples. Defaults to false.

Responses
  200 OK - The run object.
  404 Not Found - No run exists with the given ID.`,
              soru: 'You call GET /v1/runs/abc with no query parameters, and run "abc" exists. What do you get?',
              secenekler: [
                'The run with its raw samples.',
                'The run without raw samples.',
                'A 404 error, because include_samples is missing.',
              ],
              dogru: 1,
              aciklama:
                'include_samples isteğe bağlıdır ve varsayılanı false’tur; gönderilmezse ham örnekler dahil edilmez. 404 yalnızca o kimlikte bir koşu yoksa döner.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u5-d1-a6',
              soru: 'Which HTTP status code means the client has sent too many requests?',
              secenekler: ['404', '500', '429', '201'],
              dogru: 2,
              aciklama:
                '429 Too Many Requests, istek sınırının (rate limit) aşıldığını gösterir. 404 bulunamadı, 500 sunucu hatası, 201 oluşturuldu demektir.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u5-d1-a7',
              cumle: 'This parameter is optional and defaults to ten.',
              anlam: 'Bu parametre isteğe bağlıdır ve varsayılan değeri ondur.',
              celdiriciler: ['required', 'default', 'with'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u5-d1-a8',
              cumle: 'The endpoint returns a list of test runs.',
              anlam: 'Bu uç nokta test koşularının bir listesini döndürür.',
              celdiriciler: ['return', 'end', 'point'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u5-d1-a9',
              cumle: 'We hit the rate limit, so the requests are failing.',
              anlam: 'İstek sınırına takıldık, o yüzden istekler başarısız oluyor.',
              ipucu:
                'rate: /reɪt/ "reyt". "Hit the rate limit" = istek sınırına takılmak, kalıp olarak öğrenin.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u5-d1-a10',
              kaynak: 'Bu parametre isteğe bağlıdır ve varsayılan değeri yirmidir.',
              cevaplar: [
                'This parameter is optional and defaults to twenty.',
                'This parameter is optional and defaults to 20.',
                'This parameter is optional and its default value is twenty.',
                'This parameter is optional and its default value is 20.',
                'This parameter is optional and the default value is twenty.',
                'This parameter is optional and the default value is 20.',
                'This parameter is optional and the default is 20.',
                'This parameter is optional and the default is twenty.',
                'This parameter is optional and has a default value of 20.',
                'This parameter is optional and has a default value of twenty.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u5-d1-a11',
              kaynak: 'Yanıt gövdesi bir JSON nesnesi içerir.',
              cevaplar: [
                'The response body contains a JSON object.',
                'The response body includes a JSON object.',
                'The body of the response contains a JSON object.',
              ],
            },
          ],
        },
        {
          id: 'yazilim-u5-d2',
          baslik: 'Fonksiyon referansı: returns, throws, deprecated',
          gorsel: '📚',
          not: `Kütüphane belgelerinde her fonksiyonun altında aynı bölümler bulunur:

- **signature**: imza (ad, parametreler, dönüş türü)
- **Returns**: ne döndürdüğü
- **Throws / Raises**: hangi durumda hangi hatayı fırlattığı
- **deprecated**: kullanımı artık önerilmeyen; hâlâ çalışır ama ileride kaldırılacak
- **since**: hangi sürümden beri var; **removed in**: hangi sürümde kaldırıldı
- **blocking**: işi bitene kadar çağıranı bekleten
- **thread-safe**: birden çok iş parçacığından aynı anda güvenle çağrılabilen

**Kalıp:** "Returns X on success, or Y if ..." / "Throws TimeoutError if ..." / "Deprecated since 2.4: use readFrame() instead."

- It returns the number of bytes written. — Yazılan bayt sayısını döndürür.
- It throws an error if the buffer is full. — Tampon doluysa hata fırlatır.
- This method is deprecated; use the new one instead. — Bu yöntemin kullanımı önerilmiyor; yerine yenisini kullanın.
- This function is not thread-safe. — Bu fonksiyon iş parçacığı açısından güvenli değildir.

**Sık yapılan hata:** "deprecated" ile "depreciated" ❌ karıştırılır; ikincisi "değer kaybetmiş" demektir. Ayrıca deprecated ≠ removed: deprecated olan şey hâlâ çalışır.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u5-d2-a1',
              ciftler: [
                ['deprecated', 'kullanımı önerilmeyen (ileride kaldırılacak)'],
                ['throws', 'hata fırlatır'],
                ['thread-safe', 'iş parçacığı açısından güvenli'],
                ['signature', 'fonksiyon imzası'],
                ['blocking', 'çağıranı bekleten'],
                ['since', '...sürümünden beri'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u5-d2-a2',
              soru: 'This method is ___ and will be removed in version 3.0.',
              secenekler: ['depreciated', 'deprecated', 'deprecating'],
              dogru: 1,
              aciklama:
                '"Deprecated" kullanımı önerilmeyen demektir. "Depreciated" değer kaybetmiş demektir (bir arabanın değeri gibi); belgelerde yanlıştır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u5-d2-a3',
              soru: 'readFrame() ___ a TimeoutError if no frame arrives within 100 ms.',
              secenekler: ['throws', 'returns to', 'throw'],
              dogru: 0,
              aciklama:
                'Hata için "throw" (ya da Python’da "raise") kullanılır; özne tekil olduğu için "throws". "Returns to" anlamsızdır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u5-d2-a4',
              soru: 'Deprecated ___ version 2.4: use readFrame() instead.',
              secenekler: ['during', 'since', 'for'],
              dogru: 1,
              aciklama:
                '"Deprecated since 2.4" = 2.4’ten beri kullanımı önerilmiyor; belgelerdeki sabit kalıptır ("as of 2.4" da görülür). "During" bir süre boyunca, "for" bir amaç ya da süre bildirir; bir sürümden başlayan durumu anlatmaz.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u5-d2-a5',
              metin: CAN_SEND_DOC,
              soru: 'What does the function return if you pass NULL as the frame?',
              secenekler: ['0', '-ETIMEDOUT', '-EINVAL'],
              dogru: 2,
              aciklama:
                '"-EINVAL if frame is NULL" satırı bunu söylüyor: geçersiz argüman (invalid argument). 0 başarı, -ETIMEDOUT zaman aşımı demektir.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u5-d2-a6',
              metin: CAN_SEND_DOC,
              soru: 'Which statement is true according to the documentation?',
              secenekler: [
                'can_send() never blocks.',
                'You should not call can_send() inside an interrupt handler.',
                'can_send() is deprecated.',
              ],
              dogru: 1,
              aciklama:
                '"Not safe to call from an interrupt handler" notu bunu söylüyor. Fonksiyon kuyrukta yer açılana kadar bekleyebildiği (blocks) için kesme içinde çağrılmamalıdır.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u5-d2-a7',
              cumle: 'It throws an error if the buffer is full.',
              anlam: 'Tampon doluysa hata fırlatır.',
              celdiriciler: ['throw', 'returns', 'empty'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u5-d2-a8',
              cumle: 'This method is deprecated, so use the new one instead.',
              anlam: 'Bu yöntemin kullanımı önerilmiyor, yerine yenisini kullan.',
              celdiriciler: ['depreciated', 'old', 'uses'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u5-d2-a9',
              cumle: "This function is blocking, so don't call it from an interrupt.",
              anlam: 'Bu fonksiyon bekletir, o yüzden onu bir kesme içinden çağırma.',
              ipucu:
                'interrupt (isim): "İN-tı-rapt", vurgu ilk hecede. Fiil olunca vurgu kayar: "in-tı-RAPT".',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u5-d2-a10',
              kaynak: 'Bu fonksiyon iş parçacığı açısından güvenli değil.',
              cevaplar: [
                'This function is not thread-safe.',
                'This function is not thread safe.',
                'This function is not safe to call from multiple threads.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u5-d2-a11',
              kaynak: 'Bu yöntemin kullanımı önerilmiyor; yerine yenisini kullanın.',
              cevaplar: [
                'This method is deprecated; use the new one instead.',
                'This method is deprecated, so use the new one instead.',
                'This method is deprecated; please use the new one instead.',
                'This method is deprecated; use the new method instead.',
                'This method has been deprecated; use the new one instead.',
                'This method has been deprecated; use the new method instead.',
                'This method is deprecated; use the newer one instead.',
                'This method is deprecated; use the newer method instead.',
                'This method is deprecated; please use the new method instead.',
              ],
              aciklama: 'Belgelerde "kullanımı önerilmiyor" anlamındaki terim "deprecated"dır.',
            },
          ],
        },
        {
          id: 'yazilim-u5-d3',
          baslik: 'Şartname dili: MUST, SHOULD, MAY',
          gorsel: '📜',
          not: `Protokol ve arayüz şartnamelerinde (RFC’ler, iletişim protokolleri, takım içi arayüz belgeleri) bu kelimeler BÜYÜK harfle yazılır ve RFC 2119’a göre KESİN anlam taşır:

- **MUST / REQUIRED / SHALL**: zorunlu
- **MUST NOT / SHALL NOT**: kesinlikle yasak
- **SHOULD / RECOMMENDED**: güçlü öneri; geçerli bir sebep varsa ve sonuçları biliniyorsa uyulmayabilir
- **SHOULD NOT / NOT RECOMMENDED**: güçlü biçimde önerilmez; geçerli bir sebep varsa ve sonuçları biliniyorsa yapılabilir
- **MAY / OPTIONAL**: tamamen isteğe bağlı

**Örnekler**
- Each node MUST send a heartbeat every 100 ms. — Her düğüm 100 ms’de bir heartbeat göndermek zorundadır.
- The heartbeat SHOULD include the firmware version. — Heartbeat’in ürün yazılımı sürümünü içermesi önerilir.
- A node MAY include extra diagnostic fields. — Düğüm isterse ek tanı alanları ekleyebilir.
- Clients MUST NOT send more than ten requests per second. — İstemciler saniyede ondan fazla istek göndermemelidir (yasak).

**Sık yapılan hata:** "must not" ile "don't have to" karıştırılır. **must not** = yapmak YASAK; **don't have to / need not** = yapmak ZORUNLU DEĞİL. "You must not restart" ile "You don't have to restart" bambaşka şeyler söyler.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u5-d3-a1',
              ciftler: [
                ['MUST', 'zorunlu'],
                ['MUST NOT', 'kesinlikle yasak'],
                ['SHOULD', 'güçlü öneri'],
                ['MAY', 'isteğe bağlı'],
                ['SHALL', 'zorunlu (MUST ile aynı)'],
                ['need not', 'gerekmez'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u5-d3-a2',
              soru: 'Clients ___ send the Authorization header; requests without it are rejected.',
              secenekler: ['MUST', 'MAY', 'SHOULD'],
              dogru: 0,
              aciklama:
                'Başlık olmadan istek reddediliyorsa bu bir zorunluluktur: MUST. SHOULD’da istisna olabilir, MAY tamamen isteğe bağlıdır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u5-d3-a3',
              soru: 'Implementations ___ cache the response, but they are not required to.',
              secenekler: ['MUST', 'MUST NOT', 'MAY'],
              dogru: 2,
              aciklama:
                '"Not required to" = zorunlu değil, ama yasak da değil: tam olarak MAY’in anlamı.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u5-d3-a4',
              soru: 'You ___ restart the device after the update; the new settings are applied immediately.',
              secenekler: ['must not', "don't have to", 'should'],
              dogru: 1,
              aciklama:
                'Ayarlar hemen uygulandığı için yeniden başlatmak gereksizdir ama yasak değildir: "don’t have to". "Must not" yeniden başlatmayı yasaklardı.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u5-d3-a5',
              soru: "'The node MUST NOT transmit before it receives a SYNC frame.' What does this mean?",
              secenekler: [
                'Transmitting before SYNC is optional.',
                'Transmitting before SYNC is forbidden.',
                'The node does not have to transmit after SYNC.',
              ],
              dogru: 1,
              aciklama:
                'MUST NOT kesin yasaktır: SYNC gelmeden göndermek kuralı çiğner. "Optional" MAY’in, "does not have to" ise zorunluluğun olmamasının karşılığıdır.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u5-d3-a6',
              metin: `4.2 Heartbeat
Each node MUST send a heartbeat message every 100 ms. The heartbeat SHOULD include the node's firmware version. A node MAY include additional diagnostic fields; receivers MUST ignore fields they do not recognize.`,
              soru: 'Which statement is correct?',
              secenekler: [
                'Diagnostic fields are mandatory.',
                'Receivers must reject messages that contain unknown fields.',
                'A node may leave out the firmware version, but only with a good reason.',
              ],
              dogru: 2,
              aciklama:
                'Sürüm bilgisi SHOULD ile istenmiş: güçlü öneri, geçerli sebep varsa atlanabilir. Tanı alanları MAY (isteğe bağlı); alıcılar tanımadıkları alanları reddetmez, yok sayar (ignore).',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u5-d3-a7',
              cumle: 'Clients must not send more than ten requests per second.',
              anlam: 'İstemciler saniyede ondan fazla istek göndermemelidir.',
              celdiriciler: ['should', 'less', 'minute'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u5-d3-a8',
              cumle: 'The firmware version should be included in every message.',
              anlam: 'Ürün yazılımı sürümünün her mesaja eklenmesi önerilir.',
              celdiriciler: ['must', 'include', 'messages'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u5-d3-a9',
              cumle: 'According to the spec, this field is optional.',
              anlam: 'Şartnameye göre bu alan isteğe bağlı.',
              ipucu:
                'spec: "spek", specification’ın kısaltması. optional: Amerikan aksanında "AAP-şı-nıl", vurgu ilk hecede.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u5-d3-a10',
              kaynak: 'İstemciler bu alanı göndermek zorunda değildir.',
              cevaplar: [
                'Clients do not have to send this field.',
                'Clients are not required to send this field.',
                'Clients do not need to send this field.',
                'Clients need not send this field.',
                'Clients are not obliged to send this field.',
              ],
              aciklama:
                '"Zorunda değil" = do not have to / are not required to; "must not" yasak anlamına gelir.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u5-d3-a11',
              kaynak: 'Düğüm, SYNC çerçevesinden önce kesinlikle veri göndermemelidir.',
              cevaplar: [
                'The node must not send data before the SYNC frame.',
                'The node must not transmit data before the SYNC frame.',
                'The node must not transmit before the SYNC frame.',
                'The node must never send data before the SYNC frame.',
                'The node shall not send data before the SYNC frame.',
                'The node shall not transmit data before the SYNC frame.',
                'The node shall not transmit before the SYNC frame.',
                'The node must not send any data before the SYNC frame.',
                'The node must never transmit data before the SYNC frame.',
                'The node must never transmit before the SYNC frame.',
              ],
            },
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────── ÜNİTE 6 — B2
    {
      id: 'yazilim-u6',
      seviye: 'B2',
      gorsel: '🔌',
      baslik: 'Datasheet okumak',
      ozet: 'Mutlak maksimum değerler, elektriksel karakteristikler, pin şeması ve zamanlama diyagramı okumak.',
      dersler: [
        {
          id: 'yazilim-u6-d1',
          baslik: 'Mutlak maksimum değerler ve önerilen çalışma koşulları',
          gorsel: '⚠️',
          not: `Bir entegrenin datasheet’inde en çok karıştırılan iki tablo:

- **Absolute Maximum Ratings**: mutlak maksimum değerler. Bunlar tasarım hedefi DEĞİL, hasar sınırıdır. Aşılırsa **permanent damage** (kalıcı hasar) oluşabilir; bu sınırlarda bile doğru çalışma garanti edilmez.
- **Recommended Operating Conditions**: önerilen çalışma koşulları. Devre bu aralığa göre tasarlanır; çipin şartnameye uygun çalışması yalnızca burada garanti edilir.

**Tablo sütunları:** **Min / Typ / Max**: en az / tipik / en çok. "Typical" ortalama ya da örnek değerdir, GARANTİ EDİLMEZ; tasarımda Min ve Max kullanılır.

- **supply voltage**: besleme gerilimi; **current**: akım; **power**: güç
- **operating temperature**: çalışma sıcaklığı; **storage temperature**: depolama sıcaklığı

**Örnekler**
- The supply voltage must not exceed 4.0 V. — Besleme gerilimi 4,0 V’u aşmamalıdır.
- Typical values are not guaranteed. — Tipik değerler garanti edilmez.
- Design for the recommended operating range. — Önerilen çalışma aralığına göre tasarla.

**Sık yapılan hata:** Gerilime "tension" demek ❌; elektrikte doğru kelime "voltage" ✅. Ayrıca İngilizcede ondalık ayırıcı noktadır: "3,3 V" değil "3.3 V" yazılır.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u6-d1-a1',
              ciftler: [
                ['supply voltage', 'besleme gerilimi'],
                ['absolute maximum rating', 'mutlak maksimum değer'],
                ['operating temperature', 'çalışma sıcaklığı'],
                ['permanent damage', 'kalıcı hasar'],
                ['typical', 'tipik (garanti edilmeyen)'],
                ['current', 'akım'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d1-a2',
              soru: 'Exceeding the absolute maximum ratings may cause ___ damage to the device.',
              secenekler: ['typical', 'permanent', 'recommended'],
              dogru: 1,
              aciklama:
                'Datasheet’lerdeki kalıp: "Stresses beyond the absolute maximum ratings may cause permanent damage." Mutlak sınır aşılınca kalıcı hasar riski vardır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d1-a3',
              soru: 'Design your circuit for the ___ operating conditions, not for the absolute maximum ratings.',
              secenekler: ['recommended', 'absolute', 'typical'],
              dogru: 0,
              aciklama:
                'Çipin doğru çalışması önerilen çalışma koşullarında garanti edilir. Mutlak maksimum değerler yalnızca hasar sınırıdır.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u6-d1-a4',
              metin: MCU_RATINGS,
              soru: 'Your board supplies 3.8 V to VDD. Which statement is correct?',
              secenekler: [
                'It is inside the recommended range, so it is fine.',
                'It exceeds the absolute maximum rating.',
                'It is below the absolute maximum, but outside the recommended range, so correct operation is not guaranteed.',
              ],
              dogru: 2,
              aciklama:
                '3,8 V mutlak sınır olan 4,0 V’un altında ama önerilen en yüksek değer olan 3,6 V’un üstünde. Kalıcı hasar beklenmez ama çipin şartnameye uygun çalışması da garanti değildir.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u6-d1-a5',
              metin: MCU_RATINGS,
              soru: 'What is the typical supply voltage?',
              secenekler: ['1.8 V', '3.3 V', '3.6 V', '4.0 V'],
              dogru: 1,
              aciklama:
                'Recommended Operating Conditions tablosunda Typ sütunu 3.3 V gösteriyor. 1.8 ve 3.6 V önerilen aralığın uçları, 4.0 V ise mutlak maksimum değer.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u6-d1-a6',
              cumle: 'The supply voltage must not exceed four volts.',
              anlam: 'Besleme gerilimi dört voltu aşmamalıdır.',
              celdiriciler: ['exceeds', 'for', 'watts'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u6-d1-a7',
              cumle: 'Typical values are not guaranteed by the manufacturer.',
              anlam: 'Tipik değerler üretici tarafından garanti edilmez.',
              celdiriciler: ['maximum', 'guarantee', 'producer'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u6-d1-a8',
              cumle: "We're running the chip outside the recommended operating range.",
              anlam: 'Çipi önerilen çalışma aralığının dışında çalıştırıyoruz.',
              ipucu:
                'operating: "AA-pı-rey-ding", vurgu ilk hecede; Amerikan aksanında t yumuşar. outside: "aut-SAYD".',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u6-d1-a9',
              kaynak: 'Besleme gerilimi üç virgül altı voltu aşmamalıdır.',
              cevaplar: [
                'The supply voltage must not exceed three point six volts.',
                'The supply voltage must not exceed 3.6 volts.',
                'The supply voltage must not exceed 3.6 V.',
                'The supply voltage should not exceed three point six volts.',
                'The supply voltage should not exceed 3.6 volts.',
                'The supply voltage should not exceed 3.6 V.',
                'The supply voltage must not exceed 3.6V.',
                'The supply voltage should not exceed 3.6V.',
              ],
              aciklama: 'Ondalık ayırıcı İngilizcede "point"tir: 3.6 = "three point six".',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u6-d1-a10',
              kaynak: 'Tipik değerler garanti edilmez.',
              cevaplar: [
                'Typical values are not guaranteed.',
                'The typical values are not guaranteed.',
                'Typical values are not guaranteed by the manufacturer.',
              ],
            },
          ],
        },
        {
          id: 'yazilim-u6-d2',
          baslik: 'Elektriksel karakteristikler ve birimleri okumak',
          gorsel: '⚡',
          not: `**Electrical Characteristics** tablosu, belirtilen test koşullarında (örneğin VDD = 3.3 V, 25 °C) geçerli değerleri verir. Toplantıda bu değerleri sesli okuyabilmek gerekir.

- **supply current / current consumption**: besleme akımı, akım tüketimi; **draw**: (akım) çekmek
- **sleep mode / standby**: uyku kipi / bekleme
- **resolution**: çözünürlük (12-bit ADC); **accuracy**: doğruluk; **tolerance**: tolerans (izin verilen sapma)

**Birimleri sesli okumak**
- 3.3 V → "three point three volts"
- 4.2 mA → "four point two milliamps"
- 1.5 µA → "one point five microamps"
- 16 MHz → "sixteen megahertz"; 400 kHz → "four hundred kilohertz"
- ±1 % → "plus or minus one percent"; 10 kΩ → "ten kilohms" ya da kısaca "ten K"

**Kalıp:** "The chip draws about four milliamps in active mode."

**Sık yapılan hata:** Sayıdan sonra çoğul unutulur: "five volt" ❌ → "five volts" ✅. Ama sıfat olarak tirelidir ve çoğul almaz: "a five-volt supply" ✅. Ondalıkta "virgül" yerine "point" söylenir.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u6-d2-a1',
              ciftler: [
                ['current consumption', 'akım tüketimi'],
                ['tolerance', 'izin verilen sapma'],
                ['resolution', 'çözünürlük'],
                ['accuracy', 'doğruluk'],
                ['sleep mode', 'uyku kipi'],
                ['draw', '(akım) çekmek'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d2-a2',
              soru: 'The ADC has a ___ of twelve bits.',
              secenekler: ['tolerance', 'consumption', 'resolution'],
              dogru: 2,
              aciklama:
                'ADC’nin bit sayısı çözünürlüğüdür (resolution): 12 bit = 4096 seviye. Tolerance ve consumption başka kavramlardır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d2-a3',
              soru: 'The resistor has a ___ of plus or minus one percent.',
              secenekler: ['tolerance', 'resolution', 'frequency'],
              dogru: 0,
              aciklama: 'Bir direncin nominal değerden izin verilen sapması toleransıdır: ±1 %.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d2-a4',
              soru: "'3.3 V' is read aloud as 'three ___ three volts'.",
              secenekler: ['comma', 'point', 'dot'],
              dogru: 1,
              aciklama:
                'İngilizcede ondalık ayırıcı nokta yazılır ve "point" diye okunur. "Dot" dosya adı ve adreslerde, "comma" binlik ayırıcıda kullanılır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d2-a5',
              soru: 'We need a five-___ power supply.',
              secenekler: ['volts', 'volt', 'voltage'],
              dogru: 1,
              aciklama:
                'Sayı + birim bir ismin önünde sıfat olduğunda tireyle yazılır ve çoğul eki almaz: "a five-volt supply". Ama "The supply is five volts" denir.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u6-d2-a6',
              metin: `ELECTRICAL CHARACTERISTICS (VDD = 3.3 V, TA = 25 °C unless otherwise noted)
  Parameter            Conditions        Min    Typ    Max    Unit
  Supply current       Active, 16 MHz    -      4.2    6.0    mA
  Supply current       Sleep mode        -      1.5    3.0    µA
  ADC resolution                         -      12     -      bits
  Oscillator accuracy                    -2     -      +2     %`,
              soru: 'What is the maximum supply current in sleep mode?',
              secenekler: ['4.2 mA', '3.0 µA', '6.0 mA', '1.5 µA'],
              dogru: 1,
              aciklama:
                'Sleep mode satırında Max sütunu 3.0 µA. 1.5 µA aynı satırın tipik değeri; mA değerleri aktif kipe ait.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u6-d2-a7',
              cumle: 'The chip draws about four milliamps in active mode.',
              anlam: 'Çip aktif kipte yaklaşık dört miliamper çeker.',
              celdiriciler: ['draw', 'for', 'microamps'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u6-d2-a8',
              cumle: 'The internal oscillator runs at sixteen megahertz.',
              anlam: 'Dahili osilatör on altı megahertzde çalışır.',
              celdiriciler: ['sixty', 'kilohertz', 'run'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u6-d2-a9',
              cumle: 'The sleep current is one point five microamps.',
              anlam: 'Uyku akımı bir virgül beş mikroamperdir.',
              ipucu:
                'micro: "MAY-kro"; "mikro" değil. Ondalık ayırıcı "point" diye okunur, "virgül" yerine.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u6-d2-a10',
              kaynak: 'Uyku kipinde akım tüketimi çok düşüktür.',
              cevaplar: [
                'Current consumption is very low in sleep mode.',
                'The current consumption is very low in sleep mode.',
                'In sleep mode, current consumption is very low.',
                'In sleep mode, the current consumption is very low.',
                'The current draw is very low in sleep mode.',
                'In sleep mode, the current draw is very low.',
                'Current draw is very low in sleep mode.',
                'In sleep mode, current draw is very low.',
                'The current consumption in sleep mode is very low.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u6-d2-a11',
              kaynak: 'Direncin toleransı yüzde birdir.',
              cevaplar: [
                'The resistor has a tolerance of one percent.',
                'The resistor has a tolerance of 1 percent.',
                'The resistor has a tolerance of 1%.',
                "The resistor's tolerance is one percent.",
                "The resistor's tolerance is 1 percent.",
                "The resistor's tolerance is 1%.",
                'The tolerance of the resistor is one percent.',
                'The tolerance of the resistor is 1 percent.',
                'The tolerance of the resistor is 1%.',
                'The resistor has a one percent tolerance.',
                'The resistor has a 1% tolerance.',
              ],
            },
          ],
        },
        {
          id: 'yazilim-u6-d3',
          baslik: 'Pin şeması, pull-up ve zamanlama diyagramı',
          gorsel: '📍',
          not: `Datasheet’in donanımı bağlarken en çok okunan kısımları:

- **pinout**: pin şeması; **NC** (not connected): bağlantısız pin
- **pull-up resistor**: hattı VDD’ye çeken direnç; **pull-down**: GND’ye çeken
- **open-drain**: çıkış yalnızca hattı aşağı çekebilir, yukarı çekmek için pull-up gerekir (I²C’deki SDA, SCL)
- **push-pull**: çıkış hattı hem yukarı hem aşağı sürer
- **floating**: boşta; bağlı olmadığı için seviyesi tanımsız giriş
- **active low**: düşük seviyede etkin (RESET pini LOW iken çip sıfırlanır)
- **rising / falling edge**: yükselen / düşen kenar
- **setup time / hold time**: veri, saat kenarından ÖNCE / SONRA en az bu süre sabit kalmalı
- **footnote**: dipnot; tablolardaki (1), (2) işaretleri

**Örnekler**
- External pull-up resistors are required on SDA and SCL. — SDA ve SCL’de harici pull-up direnci gerekir.
- Data is sampled on the rising edge of the clock. — Veri saatin yükselen kenarında örneklenir.
- Do not leave unused inputs floating. — Kullanılmayan girişleri boşta bırakmayın.

**Sık yapılan hata:** "resistor" ile "resistance" karıştırılır. **resistor** devre elemanıdır (direnç), **resistance** onun özelliğidir (ohm cinsinden direnç değeri). "Add a pull-up resistance" ❌ → "Add a pull-up resistor" ✅.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u6-d3-a1',
              ciftler: [
                ['pinout', 'pin şeması'],
                ['pull-up resistor', 'yukarı çekme direnci'],
                ['floating', 'boşta (seviyesi tanımsız)'],
                ['rising edge', 'yükselen kenar'],
                ['active low', 'düşük seviyede etkin'],
                ['footnote', 'dipnot'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d3-a2',
              soru: 'The SDA line is open-drain, so it needs an external ___ resistor.',
              secenekler: ['pull-down', 'pull-up', 'pull-out'],
              dogru: 1,
              aciklama:
                'Open-drain çıkış hattı yalnızca aşağı çekebilir; boştayken HIGH olması için VDD’ye bir pull-up direnci gerekir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d3-a3',
              soru: 'Data is sampled on the ___ edge of the clock.',
              secenekler: ['raising', 'rose', 'rising'],
              dogru: 2,
              aciklama:
                'Terim "rising edge"dir (rise, nesnesiz fiil). "Raise" bir şeyi kaldırmaktır; "raising edge" denmez.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d3-a4',
              soru: 'The RESET pin is active low: pull it ___ to reset the chip.',
              secenekler: ['low', 'high', 'up'],
              dogru: 0,
              aciklama:
                'Active low pin, LOW seviyedeyken etkindir; çipi sıfırlamak için pin LOW’a çekilir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u6-d3-a5',
              soru: 'Do not leave unused inputs ___; tie them to ground or VDD.',
              secenekler: ['flowing', 'flying', 'floating'],
              dogru: 2,
              aciklama:
                'Bağlantısız girişe "floating" denir; seviyesi tanımsızdır, gürültü toplar ve akım tüketimini artırabilir. "Tie to ground" = toprağa bağlamak.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u6-d3-a6',
              metin: `PIN DESCRIPTIONS
  Pin  Name  Type  Description
  1    VDD   P     Supply voltage
  2    GND   P     Ground
  3    SDA   I/O   Serial data, open-drain (1)
  4    SCL   I     Serial clock (1)
  5    INT   O     Interrupt output, active low, push-pull
  6    NC    -     Not connected (2)

(1) External pull-up resistors to VDD are required.
(2) Leave floating or connect to GND.`,
              soru: 'Which statement is correct according to the table and its footnotes?',
              secenekler: [
                'SDA and SCL need external pull-up resistors.',
                'Pin 6 must be connected to VDD.',
                'INT needs a pull-up resistor because it is open-drain.',
              ],
              dogru: 0,
              aciklama:
                'Dipnot (1) SDA ve SCL için harici pull-up ister. Pin 6 boş bırakılabilir ya da GND’ye bağlanabilir; INT push-pull olduğundan pull-up gerekmez.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u6-d3-a7',
              metin: `TIMING CHARACTERISTICS
  tSU  Data setup time   min 100 ns
       Data must be stable at least 100 ns before the rising edge of SCLK.
  tH   Data hold time    min 50 ns
       Data must remain stable for at least 50 ns after the rising edge of SCLK.`,
              soru: 'Your data line changes 30 ns after the rising edge of SCLK. Which requirement is violated?',
              secenekler: ['The setup time', 'The hold time', 'Neither'],
              dogru: 1,
              aciklama:
                'Hold time verinin kenardan SONRA en az 50 ns sabit kalmasını ister; 30 ns sonra değişmek bunu ihlal eder. Setup time kenardan ÖNCEKİ süreyle ilgilidir.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u6-d3-a8',
              cumle: 'Add a pull-up resistor on the data line.',
              anlam: 'Veri hattına bir pull-up direnci ekle.',
              celdiriciler: ['pull-down', 'resistance', 'in'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u6-d3-a9',
              cumle: 'The interrupt pin is active low.',
              anlam: 'Kesme pini düşük seviyede etkindir.',
              celdiriciler: ['high', 'pins', 'activity'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u6-d3-a10',
              cumle: "Don't leave that input floating; tie it to ground.",
              anlam: 'O girişi boşta bırakma, toprağa bağla.',
              ipucu:
                'floating: "FLOU-ding"; Amerikan aksanında ortadaki t "d"ye yakın okunur. ground: "graund".',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u6-d3-a11',
              kaynak: 'Kullanılmayan girişleri boşta bırakmayın.',
              cevaplar: [
                'Do not leave unused inputs floating.',
                'Do not leave the unused inputs floating.',
                'Do not leave unused inputs unconnected.',
                'Do not leave unused inputs open.',
                'Unused inputs must not be left floating.',
                'Unused inputs should not be left floating.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u6-d3-a12',
              kaynak: 'SDA hattı harici bir pull-up direnci gerektirir.',
              cevaplar: [
                'The SDA line requires an external pull-up resistor.',
                'The SDA line needs an external pull-up resistor.',
                'The SDA line requires an external pull up resistor.',
                'The SDA line needs an external pull up resistor.',
                'The SDA line requires an external pull-up.',
                'The SDA line needs an external pull-up.',
                'An external pull-up resistor is required on the SDA line.',
                'An external pull-up resistor is needed on the SDA line.',
                'The SDA line requires an external pullup resistor.',
                'The SDA line needs an external pullup resistor.',
              ],
            },
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────── ÜNİTE 7 — C1
    {
      id: 'yazilim-u7',
      seviye: 'C1',
      gorsel: '🧑‍💻',
      baslik: 'Teknik yazım ve toplantılar',
      ozet: 'Hata raporu, PR açıklaması ve stand-up güncellemesi yazmak; kesin, ölçülü ve yoğun teknik dil kullanmak.',
      dersler: [
        {
          id: 'yazilim-u7-d1',
          baslik: 'Hata raporu (issue) yazmak',
          gorsel: '🐛',
          not: `İyi bir hata raporu, okuyanın hiçbir soru sormadan hatayı yeniden oluşturmasını sağlar. Standart yapı:

- **Title**: kısa ama özgül ("Telemetry drops packets above 500 Hz on fw 2.3.1")
- **Steps to reproduce**: numaralı, tek tek adımlar
- **Expected behavior**: ne olmalıydı
- **Actual behavior**: ne oldu
- **Environment**: ürün yazılımı sürümü, işletim sistemi, donanım
- **Frequency**: her seferinde mi (consistently), ara sıra mı (intermittently, ~1/5)
- **Severity**: önem derecesi; **attachment**: ek (log, ekran görüntüsü)

**Kesin dil:** "doesn't work" yerine neyin, ne zaman, ne kadar bozulduğunu yazın.
- The motor does not stop after the e-stop is pressed. — Acil durdurma butonuna basıldıktan sonra motor durmuyor.
- This is reproducible 5 out of 5 times. — Bu 5 denemenin 5’inde tekrarlanabiliyor.
- This regressed in 2.4.0; it works on 2.3.2. — Bu 2.4.0’da bozuldu; 2.3.2’de çalışıyor.

**Sık yapılan hata:** "Expected" ile "excepted" ❌ karıştırılır; ikincisi "hariç tutulan" demektir. Ayrıca Amerikan yazımı "behavior"dır, İngiliz yazımı "behaviour"; bir belgede ikisini karıştırmayın.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u7-d1-a1',
              ciftler: [
                ['steps to reproduce', 'yeniden oluşturma adımları'],
                ['expected behavior', 'beklenen davranış'],
                ['actual behavior', 'gerçekleşen davranış'],
                ['severity', 'önem derecesi'],
                ['environment', 'ortam (sürüm, işletim sistemi, donanım)'],
                ['attachment', 'ek dosya'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u7-d1-a2',
              soru: '___ behavior: the motor stops within 200 ms after the emergency stop is pressed.',
              secenekler: ['Excepted', 'Expected', 'Expecting'],
              dogru: 1,
              aciklama:
                'Hata raporundaki başlık "Expected behavior"dır (beklenen davranış). "Excepted" hariç tutulan demektir; sık yapılan bir yazım hatasıdır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u7-d1-a3',
              soru: 'The crash happens ___: about one run in five.',
              secenekler: ['consistently', 'intermittently', 'permanently'],
              dogru: 1,
              aciklama:
                '"Beş denemede bir" düzensiz bir sıklıktır: intermittently. Consistently her seferinde demek olurdu.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u7-d1-a4',
              soru: 'Which issue title is the most useful?',
              secenekler: [
                "Telemetry doesn't work",
                'URGENT!!! big problem with the data',
                'Telemetry drops packets above 500 Hz on firmware 2.3.1',
              ],
              dogru: 2,
              aciklama:
                'İyi bir başlık neyin, hangi koşulda, hangi sürümde bozulduğunu söyler. "Doesn’t work" ve "big problem" hiçbir bilgi vermez.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u7-d1-a5',
              metin: `Title: IMU readings freeze after CAN bus-off recovery

Steps to reproduce:
1. Start the pod controller (fw 2.4.0).
2. Disconnect the CAN cable for 5 s, then reconnect it.

Expected: IMU values resume within 1 s.
Actual: IMU values stay frozen until the controller is rebooted.
Frequency: 5/5 attempts.
Regression: works as expected on fw 2.3.2.`,
              soru: 'Which conclusion is best supported by the report?',
              secenekler: [
                'The bug is reproducible and was introduced between 2.3.2 and 2.4.0.',
                'The bug happens only occasionally.',
                'The IMU hardware is broken.',
              ],
              dogru: 0,
              aciklama:
                '5/5 deneme her seferinde tekrarlandığını, 2.3.2’de çalışması ise hatanın 2.4.0’a geçerken eklendiğini (regression) gösterir. Sorunun yeniden başlatmayla geçmesi ve eski sürümde görülmemesi donanım arızasından çok yazılım hatasına işaret eder.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u7-d1-a6',
              cumle: 'The issue is reproducible on the latest firmware.',
              anlam: 'Sorun en son ürün yazılımında yeniden oluşturulabiliyor.',
              celdiriciler: ['reproduce', 'last', 'hardware'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u7-d1-a7',
              cumle: 'Please attach the full log to the issue.',
              anlam: 'Lütfen tam kaydı (log) issue’ya ekle.',
              celdiriciler: ['attack', 'logs', 'in'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u7-d1-a8',
              cumle: 'This looks like a regression introduced in version two point four.',
              anlam: 'Bu, 2.4 sürümüyle gelmiş bir gerilemeye (regression) benziyor.',
              ipucu:
                'Sürüm numaraları "two point four" diye okunur. regression: "ri-GRE-şın"; introduced: "in-trı-DUUST".',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u7-d1-a9',
              kaynak: 'Hata en son ürün yazılımında yeniden oluşturulabiliyor.',
              cevaplar: [
                'The bug is reproducible on the latest firmware.',
                'The bug can be reproduced on the latest firmware.',
                'The bug is reproducible with the latest firmware.',
                'The bug can be reproduced with the latest firmware.',
                'The bug is reproducible on the latest firmware version.',
                'The bug can be reproduced on the latest firmware version.',
                'The issue is reproducible on the latest firmware.',
                'The issue can be reproduced on the latest firmware.',
                'The error is reproducible on the latest firmware.',
                'The error can be reproduced on the latest firmware.',
                'The bug is reproducible in the latest firmware.',
                'The bug can be reproduced in the latest firmware.',
                'The issue is reproducible on the latest firmware version.',
                'The issue can be reproduced on the latest firmware version.',
                'The issue is reproducible with the latest firmware.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u7-d1-a10',
              kaynak: 'Beklenen davranış: motor yarım saniye içinde durur.',
              cevaplar: [
                'Expected behavior: the motor stops within half a second.',
                'Expected behavior: the motor stops within 0.5 seconds.',
                'Expected behavior: the motor stops within 500 ms.',
                'Expected behavior: the motor stops within 500 milliseconds.',
                'Expected behavior: the motor stops in less than half a second.',
                'Expected behaviour: the motor stops within half a second.',
                'Expected: the motor stops within half a second.',
                'Expected behavior: the motor stops within 0.5 s.',
                'Expected behavior: the motor should stop within half a second.',
                'Expected behavior: the motor stops in under half a second.',
              ],
            },
          ],
        },
        {
          id: 'yazilim-u7-d2',
          baslik: 'PR açıklaması ve stand-up güncellemesi',
          gorsel: '📣',
          not: `**PR açıklaması** inceleyenin işini kolaylaştırır. Yaygın bölümler:
- **Summary**: ne değişti (bir iki cümle)
- **Why / Motivation**: neden gerekliydi
- **Testing**: nasıl test edildi
- **Out of scope**: bilerek yapılmayanlar
- **Closes #219**: birleşince ilgili issue’yu kapatır

**Stand-up** (günlük kısa toplantı) üç sorunun cevabıdır: dün ne yaptım, bugün ne yapacağım, beni ne engelliyor?
- Yesterday I finished the CAN driver. — Dün CAN sürücüsünü bitirdim.
- Today I'm going to write tests for it. — Bugün onun testlerini yazacağım.
- I'm blocked on access to the test bench. — Test tezgâhına erişim olmadığı için ilerleyemiyorum.
- I'm on track to finish by Thursday. — Perşembeye bitirecek şekilde plana uygun gidiyorum.
- Just a heads-up: the demo moved to Friday. — Bilginiz olsun: demo cumaya kaydı.

- **blocked on** + iş/şey, **blocked by** + kişi/ekip/başka iş
- **follow up**: takip etmek; **ETA**: tahmini bitiş zamanı

**Sık yapılan hata:** "I will make a research" ❌ → "I'll look into it" ✅ ya da "I'll do some research" ✅. "I'm blocked from the review" ❌ → "I'm blocked on the review" ✅.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u7-d2-a1',
              ciftler: [
                ['blocked on', '...yüzünden ilerleyemiyor'],
                ['follow up', 'takip etmek'],
                ['heads-up', 'önceden haber, uyarı'],
                ['out of scope', 'kapsam dışı'],
                ['on track', 'plana uygun ilerliyor'],
                ['ETA', 'tahmini bitiş zamanı'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u7-d2-a2',
              soru: "I'm blocked ___ the firmware review, so I can't merge yet.",
              secenekler: ['from', 'on', 'at'],
              dogru: 1,
              aciklama:
                'Bir iş yüzünden ilerleyememek "blocked on" ile söylenir. Engel bir kişi ya da ekipse "blocked by the hardware team" da denir; "blocked from" burada yanlıştır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u7-d2-a3',
              soru: "I'll ___ into the timeout issue after lunch.",
              secenekler: ['make', 'search', 'look'],
              dogru: 2,
              aciklama:
                '"Look into something" = bir konuyu incelemek, araştırmak. "Make into" ve "search into" bu anlamda kullanılmaz.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u7-d2-a4',
              soru: 'Which stand-up update is the clearest?',
              secenekler: [
                'I worked on stuff. Same today. No problems maybe.',
                "Yesterday I finished the CAN driver. Today I'll write tests for it. I'm blocked on access to the test bench.",
                'The CAN driver, tests, and the bench are all things I am doing or maybe will do.',
              ],
              dogru: 1,
              aciklama:
                'İyi bir stand-up güncellemesi dün, bugün ve engeli açıkça söyler. Diğer seçenekler belirsizdir ve ekibin harekete geçebileceği bilgi vermez.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u7-d2-a5',
              metin: `Summary
Adds a watchdog to the telemetry task so the pod controller recovers if the task hangs.

Why
During the Oct 14 run, the telemetry task stopped responding and we lost 40 s of data.

Testing
- Unit tests for the watchdog timer
- Forced a hang on the test bench; the task restarted within 500 ms

Out of scope
Persisting data that was buffered before the restart (tracked in #231).

Closes #219`,
              soru: 'What does this PR NOT do?',
              secenekler: [
                'Restart the telemetry task when it hangs.',
                'Add unit tests for the watchdog.',
                'Keep the data that was in the buffer before the restart.',
              ],
              dogru: 2,
              aciklama:
                '"Out of scope" bölümü, yeniden başlatma öncesi tamponlanmış verinin saklanmasının bu PR’ın konusu olmadığını ve #231’de takip edildiğini söylüyor.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u7-d2-a6',
              cumle: "I'm blocked on access to the test bench.",
              anlam: 'Test tezgâhına erişim olmadığı için ilerleyemiyorum.',
              celdiriciler: ['from', 'bank', 'blocking'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u7-d2-a7',
              cumle: 'Just a heads-up: the demo moved to Friday.',
              anlam: 'Bilginiz olsun: demo cumaya kaydı.',
              celdiriciler: ['head', 'Monday', 'moves'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u7-d2-a8',
              cumle: "I'm on track to finish the driver by Thursday.",
              anlam: 'Sürücüyü perşembeye kadar bitirecek şekilde plana uygun gidiyorum.',
              ipucu:
                'Thursday: "THÖRZ-dey"; "th" dil dişlerin arasındayken. track: /træk/, "trek"e yakın.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u7-d2-a9',
              kaynak: 'Bu, bu PR’ın kapsamı dışında.',
              cevaplar: [
                'This is out of scope for this PR.',
                'This is outside the scope of this PR.',
                'This is out of the scope of this PR.',
                'This is beyond the scope of this PR.',
                'This is out of scope for this pull request.',
                'This is outside the scope of this pull request.',
                'This is beyond the scope of this pull request.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u7-d2-a10',
              kaynak: 'Bunu inceleyip sana dönerim.',
              cevaplar: [
                'I will look into it and get back to you.',
                'I will look into this and get back to you.',
                'I will look into it and follow up with you.',
                'I will look into this and follow up with you.',
                'I will investigate it and get back to you.',
                'I will investigate this and get back to you.',
                'Let me look into it and get back to you.',
                'Let me look into this and get back to you.',
                'I will check it and get back to you.',
                'I will check this and get back to you.',
                'I will look into it and let you know.',
                'I will look into this and let you know.',
                'Let me look into it and let you know.',
                'I will look into it and get back to you on it.',
              ],
            },
          ],
        },
        {
          id: 'yazilim-u7-d3',
          baslik: 'Kesin, ölçülü ve yoğun teknik yazım',
          gorsel: '🎯',
          not: `C1 düzeyinde teknik yazının üç özelliği vardır: **kesinlik**, **ölçülülük (hedging)** ve **yoğunluk**.

**1. Kesinlik:** Sıfat yerine sayı. "Latency got a lot worse" yerine "p95 latency increased from 12 ms to 48 ms".

**2. Ölçülülük:** Kanıt kadar iddia edin.
- **suggests / indicates**: gösteriyor gibi (proves değil)
- **is likely caused by**: muhtemelen ...’den kaynaklanıyor
- **we cannot rule out**: ...’yi ekarte edemiyoruz
- **appears to**: ...gibi görünüyor

**3. Yoğunluk:** Uzun "ve" zincirleri yerine kısa yan cümleler ve bağlaçlar.
- **respectively**: sırasıyla
- **unless / provided that**: ...medikçe / ...şartıyla
- **whereas**: oysa, -iken
- **at the cost of**: ...pahasına

**Örnekler**
- The data suggests that the overshoot is caused by the integral term. — Veriler aşmanın integral teriminden kaynaklandığına işaret ediyor.
- Frames received during reset are discarded. — Sıfırlama sırasında gelen çerçeveler atılır.
- The sensors sample at 1 kHz and 500 Hz, respectively. — Sensörler sırasıyla 1 kHz ve 500 Hz’de örnekleme yapar.

**Sık yapılan hata:** "According to me" ❌ → "In my view" / "I think" ✅. Tek bir testten sonra "This proves the bug is fixed" demek de aşırı iddiadır: "This suggests the fix works" ✅.`,
          alistirmalar: [
            {
              tur: 'eslestir',
              id: 'yazilim-u7-d3-a1',
              ciftler: [
                ['rule out', 'olasılığı elemek, ekarte etmek'],
                ['likely', 'muhtemel'],
                ['respectively', 'sırasıyla'],
                ['provided that', '...şartıyla'],
                ['mitigate', 'etkisini azaltmak'],
                ['whereas', 'oysa, -iken'],
              ],
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u7-d3-a2',
              soru: 'The data ___ that the overshoot is caused by the integral term, but we need more runs to confirm it.',
              secenekler: ['proves', 'suggests', 'guarantees'],
              dogru: 1,
              aciklama:
                '"We need more runs to confirm it" kesin kanıt olmadığını söylüyor; bu yüzden ölçülü fiil "suggests" uygun. "Proves" ve "guarantees" cümlenin ikinci yarısıyla çelişir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u7-d3-a3',
              soru: 'We have not been able to ___ out a hardware fault.',
              secenekler: ['roll', 'take', 'rule'],
              dogru: 2,
              aciklama:
                '"Rule out" = bir olasılığı elemek. "Roll out" yeni bir sürümü yaygınlaştırmaktır; anlam tamamen farklıdır.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u7-d3-a4',
              soru: 'The front and rear sensors sample at 1 kHz and 500 Hz, ___.',
              secenekler: ['respectively', 'relatively', 'accordingly'],
              dogru: 0,
              aciklama:
                '"Respectively" iki listeyi sırayla eşleştirir: ön sensör 1 kHz, arka sensör 500 Hz. "Relatively" görece, "accordingly" buna göre demektir.',
            },
            {
              tur: 'bosluk',
              id: 'yazilim-u7-d3-a5',
              soru: 'The cached value is used ___ it is older than five seconds, in which case it is fetched again.',
              secenekler: ['provided that', 'unless', 'whereas'],
              dogru: 1,
              aciklama:
                '"Unless" = ...medikçe: değer beş saniyeden eski DEĞİLSE kullanılır, eskiyse yeniden alınır. "Provided that" anlamı tersine çevirirdi.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u7-d3-a6',
              soru: 'Which sentence is the most precise for a design document?',
              secenekler: [
                'Latency got a lot worse when we turned on logging.',
                'p95 latency increased from 12 ms to 48 ms after debug logging was enabled.',
                'The logger is probably bad for performance in general.',
              ],
              dogru: 1,
              aciklama:
                '"p95 latency increased from 12 ms to 48 ms…" cümlesi ölçütü (p95), önceki ve sonraki değeri ve koşulu veriyor. "Got a lot worse" ve "probably bad … in general" ölçülemez ve doğrulanamaz.',
            },
            {
              tur: 'secmeli',
              id: 'yazilim-u7-d3-a7',
              metin: `Frames received while the controller is in the bus-off state are discarded rather than queued, since replaying stale sensor data after recovery could cause the state estimator to diverge. Applications that require lossless delivery should instead enable the persistent buffer, at the cost of up to 8 KB of additional RAM.`,
              soru: 'Why are frames discarded instead of queued?',
              secenekler: [
                'Because the persistent buffer is always enabled.',
                'Because queuing them would use 8 KB of flash memory.',
                'Because replaying old data after recovery could make the state estimator diverge.',
              ],
              dogru: 2,
              aciklama:
                '"Since" ile başlayan yan cümle sebebi veriyor: eski (stale) veriyi sonradan işlemek durum kestiricisinin ıraksamasına yol açabilir. 8 KB, kalıcı tamponun RAM maliyetidir; tampon varsayılan olarak açık değildir.',
            },
            {
              tur: 'dinle',
              id: 'yazilim-u7-d3-a8',
              cumle: 'The overshoot is likely caused by the integral term.',
              anlam: 'Aşma muhtemelen integral teriminden kaynaklanıyor.',
              celdiriciler: ['like', 'integrated', 'causes'],
            },
            {
              tur: 'dinle',
              id: 'yazilim-u7-d3-a9',
              cumle: 'We cannot rule out a hardware fault at this stage.',
              anlam: 'Bu aşamada bir donanım arızasını ekarte edemiyoruz.',
              celdiriciler: ['roll', 'software', 'state'],
            },
            {
              tur: 'konus',
              id: 'yazilim-u7-d3-a10',
              cumle: 'The results suggest the fix works, but we need more data.',
              anlam:
                'Sonuçlar düzeltmenin işe yaradığını gösteriyor gibi, ama daha fazla veriye ihtiyacımız var.',
              ipucu: 'suggest: Amerikan aksanında /səɡˈdʒest/ "sıg-CEST", vurgu ikinci hecede.',
            },
            {
              tur: 'yaz',
              id: 'yazilim-u7-d3-a11',
              kaynak: 'Gecikme muhtemelen loglamadan kaynaklanıyor.',
              cevaplar: [
                'The latency is likely caused by logging.',
                'The latency is probably caused by logging.',
                'The latency is most likely caused by logging.',
                'The latency is likely caused by the logging.',
                'The latency is probably caused by the logging.',
                'Latency is likely caused by logging.',
                'Latency is probably caused by logging.',
                'The latency is likely due to logging.',
                'The latency is probably due to logging.',
                'The delay is likely caused by logging.',
                'The delay is probably caused by logging.',
                'The latency is most likely due to logging.',
                'The latency is most likely caused by the logging.',
                'The delay is likely due to logging.',
                'The delay is probably due to logging.',
              ],
            },
            {
              tur: 'yaz',
              id: 'yazilim-u7-d3-a12',
              kaynak: 'Bir donanım arızasını henüz ekarte edemedik.',
              cevaplar: [
                'We have not been able to rule out a hardware fault yet.',
                'We have not yet been able to rule out a hardware fault.',
                'We have not ruled out a hardware fault yet.',
                'We have not yet ruled out a hardware fault.',
                'We cannot rule out a hardware fault yet.',
                'We have not been able to rule out a hardware failure yet.',
                'We have not ruled out a hardware failure yet.',
                'We have not yet ruled out a hardware failure.',
                'We cannot rule out a hardware failure yet.',
              ],
            },
          ],
        },
      ],
    },
  ],
};
