import type { Unite } from './tipler';

/**
 * Ek üniteler (2026-11-06) — seviyesine göre ders yoluna yerleşir (`mufredat.ts`).
 * Gömülü sistemler (A2), web ve veritabanı (B1), güvenlik-test-DevOps (B2), tasarım
 * dokümanı ve makale okuma (C1). Kimlikler KALICI.
 */

// ─────────────────────────────────────────────── ÜNİTE 8 — A2
const U8: Unite = {
  id: 'yazilim-u8',
  seviye: 'A2',
  baslik: 'Donanım ve gömülü sistemlerin dili',
  gorsel: '🔌',
  ozet: 'Mikrodenetleyici, sensör, GPIO, haberleşme protokolleri ve kesmeler; onaltılık ve ikilik sayıları sesli okumak.',
  dersler: [
    {
      id: 'yazilim-u8-d1',
      baslik: 'Mikrodenetleyici, sensör, eyleyici ve GPIO',
      gorsel: '📟',
      not: `Gömülü sistemlerde hep aynı birkaç kelime döner; önemli olan onları doğru fiille kullanmak.

**Temel terimler**
- **microcontroller (MCU)**: mikrodenetleyici; işlemci, bellek ve çevre birimleri tek yongada
- **peripheral**: çevre birimi (timer, ADC, UART)
- **sensor**: sensör, algılayıcı; bir büyüklüğü **ölçer** (measure)
- **actuator**: eyleyici; bir şeyi **hareket ettirir** ya da **sürer** (motor, valf)
- **GPIO** (general-purpose input/output): genel amaçlı giriş/çıkış pini
- **firmware**: kartta çalışan gömülü yazılım; **flash**: kartı programlamak

**Kalıp:** Pini önce "configure as an input / an output" ile ayarlar, sonra "set high / set low" ya da "read" deriz.

- The sensor measures the temperature of the battery. — Sensör bataryanın sıcaklığını ölçer.
- We configure the pin as an output. — Pini çıkış olarak ayarlıyoruz.
- Set the pin high to turn on the LED. — LED’i yakmak için pini yüksek seviyeye çek.
- The actuator opens the brake valve. — Eyleyici fren valfini açar.

**Sık yapılan hata:** "The sensor measures to the temperature" ❌ → "The sensor measures the temperature" ✅; measure doğrudan nesne alır, "to" almaz. Pin de "açılıp kapanmaz": "open the pin" ❌ yerine "set the pin high" ✅ ya da "drive the pin low" ✅ denir.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u8-d1-a1',
          ciftler: [
            ['microcontroller', 'mikrodenetleyici'],
            ['sensor', 'sensör (algılayıcı)'],
            ['actuator', 'eyleyici'],
            ['peripheral', 'çevre birimi'],
            ['firmware', 'gömülü yazılım'],
            ['output pin', 'çıkış pini'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u8-d1-a2',
          soru: 'A temperature ___ tells the controller how hot the motor is.',
          secenekler: ['sensor', 'actuator', 'peripheral'],
          dogru: 0,
          aciklama:
            'Bir büyüklüğü ölçüp bildiren parça sensördür. Actuator (eyleyici) ölçmez, hareket ettirir; peripheral ise mikrodenetleyicinin içindeki çevre birimidir, motorun sıcaklığını kendisi ölçemez.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u8-d1-a3',
          soru: 'To read a push button, you have to configure the pin as an ___.',
          secenekler: ['input', 'output', 'actuator'],
          dogru: 0,
          aciklama:
            'Butonun durumunu okumak için pin giriş (input) olmalıdır. Output pini bir şeyi sürmek içindir; actuator ise pin türü değil, motor ya da valf gibi bir cihazdır.',
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u8-d1-a4',
          soru: 'Which sentence is correct?',
          secenekler: [
            'The sensor measures to the pressure.',
            'The sensor measures the pressure.',
            'The sensor is measure the pressure.',
          ],
          dogru: 1,
          aciklama:
            '"Measure" geçişli bir fiildir, nesneyi doğrudan alır: "measures the pressure". "Measures to" yanlıştır; "is measure" ise iki fiili yan yana koyar, doğrusu "measures" ya da "is measuring" olurdu.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u8-d1-a5',
          gorsel: '💡',
          cumle: 'Set the pin high to turn on the LED.',
          anlam: 'LED’i yakmak için pini yüksek seviyeye çek.',
          celdiriciler: ['low', 'off', 'open'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u8-d1-a6',
          cumle: 'The actuator opens the brake valve.',
          anlam: 'Eyleyici fren valfini açar.',
          celdiriciler: ['sensor', 'break', 'closes'],
          aciklama:
            '"Brake" (fren) ile "break" (kırmak) aynı okunur: "breyk". Fren anlamında yazılışı brake’tir.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u8-d1-a7',
          cumle: 'I flashed the new firmware onto the board.',
          anlam: 'Yeni firmware’i karta yükledim.',
          ipucu:
            'firmware: "FÖRM-wer", vurgu ilk hecede. flashed tek hecedir: "fleşt"; sondaki "-ed" ayrı okunmaz.',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u8-d1-a8',
          kaynak: 'Pini çıkış olarak ayarla.',
          cevaplar: [
            'Configure the pin as an output.',
            'Configure the pin as output.',
            'Set the pin as an output.',
            'Set the pin as output.',
            'Set the pin to output.',
            'Set the pin to output mode.',
            'Set up the pin as an output.',
            'Set up the pin as output.',
            'Make the pin an output.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u8-d1-a9',
          kaynak: 'Sensör bataryanın sıcaklığını ölçer.',
          cevaplar: [
            'The sensor measures the temperature of the battery.',
            'The sensor measures the battery temperature.',
            'The sensor measures battery temperature.',
            "The sensor measures the battery's temperature.",
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u8-d1-a10',
          metin: `PA5   GPIO, push-pull output
      Drives the status LED (active high).
PC13  GPIO, input with internal pull-up
      Reads the user button (pressed = low).`,
          soru: 'What does the firmware read on PC13 while the user is pressing the button?',
          secenekler: ['A low level', 'A high level', 'Nothing, because PC13 is an output'],
          dogru: 0,
          aciklama:
            'Notta "pressed = low" yazıyor: dahili pull-up pini buton bırakıldığında yüksekte tutar, butona basılınca pin düşük okunur. PC13 bir giriştir; çıkış olan PA5’tir.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u8-d1-a11',
          cumle: 'The microcontroller reads the sensor every ten milliseconds.',
          anlam: 'Mikrodenetleyici sensörü her on milisaniyede bir okur.',
          ipucu:
            'microcontroller: "may-kro-kın-TROU-lır", vurgu "trol" hecesinde. milliseconds: "MİL-i-se-kındz".',
        },
      ],
    },
    {
      id: 'yazilim-u8-d2',
      baslik: 'UART, SPI, I2C ve CAN',
      gorsel: '🔗',
      not: `Kartlar ve yongalar seri haberleşme protokolleriyle konuşur:

- **UART** ("YU-art"): iki hat (TX ve RX), saat hattı yok; iki tarafın aynı **baud rate**’e ayarlanması gerekir.
- **SPI** ("es-pi-ay"): saat (clock), veri hatları ve her çevre birimi için ayrı bir **chip select** hattı; hızlıdır, **full-duplex** çalışır.
- **I2C** ("ay-skuerd-si" ya da "ay-tu-si"): yalnızca iki hat (SDA ve SCL); her cihazın bir **address**’i vardır, hatlarda **pull-up** direnci gerekir.
- **CAN bus** ("ken bas"): araçlarda kullanılan, diferansiyel iki telli, gürültüye dayanıklı veri yolu; iki ucunda **termination resistor** (sonlandırma direnci) bulunur. Veri **frame** (çerçeve) olarak gider, hattaki her cihaz bir **node**’dur (düğüm).

**Kalıp:** "X talks to Y over SPI."

- The IMU talks to the MCU over SPI. — IMU, MCU ile SPI üzerinden haberleşir.
- Both sides must use the same baud rate. — İki taraf da aynı baud hızını kullanmalı.
- Each node sends frames on the CAN bus. — Her düğüm CAN hattına çerçeve gönderir.

**Sık yapılan hata:** Artikel yazıma değil sese bakar: UART "yu" sesiyle başladığı için "an UART" ❌ → "a UART" ✅; SPI "es" sesiyle başladığı için "an SPI flash" ✅. Türkçedeki "SPI ile" de İngilizcede "over SPI" ya da "via SPI" olur; "with" konuşulan cihazı gösterir.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u8-d2-a1',
          ciftler: [
            ['baud rate', 'baud hızı'],
            ['chip select', 'çip seçme hattı'],
            ['termination resistor', 'sonlandırma direnci'],
            ['clock line', 'saat hattı'],
            ['frame', 'çerçeve'],
            ['node', 'düğüm'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u8-d2-a2',
          soru: 'UART has no clock line, so both sides must use the same ___.',
          secenekler: ['baud rate', 'chip select', 'address'],
          dogru: 0,
          aciklama:
            'UART’ta saat hattı olmadığı için zamanlama iki tarafın önceden aynı baud hızına ayarlanmasına dayanır. Chip select SPI’ın, adres ise I2C’nin kavramıdır.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u8-d2-a3',
          soru: 'On the I2C bus, the controller selects each device by its ___.',
          secenekler: ['address', 'baud rate', 'chip select line'],
          dogru: 0,
          aciklama:
            'I2C’de yalnızca SDA ve SCL vardır; cihaz, hatta gönderilen adresle seçilir. Ayrı chip select hattı SPI’da bulunur, baud hızı ise UART terimidir.',
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u8-d2-a4',
          soru: 'UART is read "YU-art" and SPI is read "es-pi-ay". Which phrase uses the articles correctly?',
          secenekler: [
            'an UART and a SPI flash',
            'a UART and an SPI flash',
            'a UART and a SPI flash',
          ],
          dogru: 1,
          aciklama:
            'A/an seçimi ilk harfe değil ilk sese bakar. "YU-art" ünsüz sesle (y) başlar, bu yüzden "a UART"; "es-pi-ay" ünlü sesle başlar, bu yüzden "an SPI flash".',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u8-d2-a5',
          cumle: 'The sensor talks to the microcontroller over SPI.',
          anlam: 'Sensör, mikrodenetleyici ile SPI üzerinden haberleşir.',
          celdiriciler: ['with', 'under', 'speaks'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u8-d2-a6',
          cumle: 'Both sides must use the same baud rate.',
          anlam: 'İki taraf da aynı baud hızını kullanmalı.',
          celdiriciler: ['side', 'most', 'speed'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u8-d2-a7',
          cumle: 'Each node sends frames on the CAN bus.',
          anlam: 'Her düğüm CAN hattına çerçeve gönderir.',
          ipucu: 'CAN, İngilizcedeki "can" kelimesi gibi okunur: "ken". bus: "bas". node: "noud".',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u8-d2-a8',
          kaynak: 'İki taraf da aynı baud hızını kullanmalı.',
          cevaplar: [
            'Both sides must use the same baud rate.',
            'Both sides should use the same baud rate.',
            'Both sides need to use the same baud rate.',
            'Both sides have to use the same baud rate.',
            'Both ends must use the same baud rate.',
            'Both ends should use the same baud rate.',
            'Both ends need to use the same baud rate.',
            'Both ends have to use the same baud rate.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u8-d2-a9',
          kaynak: 'IMU, MCU ile SPI üzerinden haberleşir.',
          cevaplar: [
            'The IMU talks to the MCU over SPI.',
            'The IMU talks with the MCU over SPI.',
            'The IMU communicates with the MCU over SPI.',
            'The IMU talks to the MCU via SPI.',
            'The IMU talks with the MCU via SPI.',
            'The IMU communicates with the MCU via SPI.',
            'The IMU talks to the MCU through SPI.',
            'The IMU communicates with the MCU through SPI.',
            'The IMU talks to the MCU using SPI.',
            'The IMU communicates with the MCU using SPI.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u8-d2-a10',
          metin: `Bus summary — sensor board, rev B
- IMU:           SPI, up to 10 MHz, CS on PB6
- Barometer:     I2C, address 0x76, 400 kHz
- Debug console: UART, 115200 baud
- Pod network:   CAN, 500 kbit/s, 120 Ω at both ends`,
          soru: 'Which device needs its own chip select line?',
          secenekler: ['The IMU', 'The barometer', 'The debug console'],
          dogru: 0,
          aciklama:
            'Chip select (CS) SPI’a özgüdür; tabloda IMU satırında "CS on PB6" yazıyor. Barometre I2C’de olduğu için adresiyle (0x76) seçilir, debug konsolu ise UART ile noktadan noktaya bağlıdır.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u8-d2-a11',
          cumle: 'Check the termination resistor at each end of the bus.',
          anlam: 'Hattın her iki ucundaki sonlandırma direncini kontrol et.',
          ipucu:
            'termination: "tör-mi-NEY-şın", vurgu üçüncü hecede. resistor: "ri-ZİS-tır", "s" burada "z" gibi okunur.',
        },
      ],
    },
    {
      id: 'yazilim-u8-d3',
      baslik: 'Kesmeler ve zamanlayıcılar',
      gorsel: '⚡',
      not: `**Interrupt** (kesme), bir olay olduğunda işlemcinin o anki işini bırakıp özel bir fonksiyonu çalıştırmasıdır. Bu fonksiyona **interrupt handler** ya da **ISR** (interrupt service routine) denir.

- **fire / trigger**: (kesme) tetiklenmek: "The interrupt fires."
- **rising edge / falling edge**: yükselen kenar / düşen kenar
- **polling**: yoklama; bir bayrağı döngüde sürekli kontrol etmek
- **timer**: zamanlayıcı; **overflow**: taşma
- **enable / disable**: (kesmeyi) etkinleştirmek / devre dışı bırakmak
- **priority**: öncelik; **pending**: bekleyen (henüz işlenmemiş) kesme

**Kalıp:** Olayı "when" ile, sonucu geniş zamanla anlatırız: "When the timer overflows, the interrupt fires and the handler runs."

- The interrupt fires on a falling edge. — Kesme düşen kenarda tetiklenir.
- Keep the interrupt handler short. — Kesme işleyicisini kısa tut.
- We switched from polling to interrupts. — Yoklamadan kesmelere geçtik.
- The timer overflows every millisecond. — Zamanlayıcı her milisaniyede taşar.

**Sık yapılan hata:** Kesme "açılıp kapanmaz": "close the interrupts" ❌ → "disable interrupts" ✅, "open the interrupt" ❌ → "enable the interrupt" ✅. Kenar için de "in the rising edge" ❌ değil, "on the rising edge" ✅ denir.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u8-d3-a1',
          ciftler: [
            ['interrupt', 'kesme'],
            ['rising edge', 'yükselen kenar'],
            ['falling edge', 'düşen kenar'],
            ['polling', 'yoklama'],
            ['timer', 'zamanlayıcı'],
            ['overflow', 'taşma'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u8-d3-a2',
          soru: 'The interrupt fires ___ the rising edge of the signal.',
          secenekler: ['on', 'in', 'to'],
          dogru: 0,
          aciklama:
            'Kenardan söz ederken "on the rising edge" denir (zaman anı vurgulanırken "at" da duyulur). "In the rising edge" ve "to the rising edge" kullanılmaz.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u8-d3-a3',
          soru: 'Before this critical section, we ___ interrupts, and we turn them back on right after it.',
          secenekler: ['disable', 'enable', 'close'],
          dogru: 0,
          aciklama:
            'Cümlenin devamı kesmeleri "yeniden açtığımızı" söylüyor; demek ki önce kapatılmışlar: disable. Enable tam tersidir; "close" ise kesmeler için kullanılmaz.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u8-d3-a4',
          soru: 'Instead of ___ the flag in a loop, the firmware now waits for an interrupt.',
          secenekler: ['polling', 'firing', 'overflowing'],
          dogru: 0,
          aciklama:
            'Bir bayrağı döngüde sürekli kontrol etmek "polling"dir (yoklama). Fire kesmenin tetiklenmesi, overflow zamanlayıcının taşmasıdır; ikisi de bayrağı kontrol etmek anlamına gelmez.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u8-d3-a5',
          cumle: 'Keep the interrupt handler as short as possible.',
          anlam: 'Kesme işleyicisini olabildiğince kısa tut.',
          celdiriciler: ['shorter', 'handle', 'long'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u8-d3-a6',
          gorsel: '⏱️',
          cumle: 'The timer overflows every millisecond.',
          anlam: 'Zamanlayıcı her milisaniyede taşar.',
          celdiriciler: ['overflow', 'milliseconds', 'time'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u8-d3-a7',
          cumle: 'We switched from polling to interrupts.',
          anlam: 'Yoklamadan kesmelere geçtik.',
          ipucu:
            'interrupts: isim olduğunda vurgu ilk hecede, "İN-tı-rapts". polling: "POU-ling"; "pooling" (havuzlama, "PUU-ling") ile karıştırmayın.',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u8-d3-a8',
          kaynak: 'Kesme düşen kenarda tetiklenir.',
          cevaplar: [
            'The interrupt fires on a falling edge.',
            'The interrupt fires on the falling edge.',
            'The interrupt triggers on a falling edge.',
            'The interrupt triggers on the falling edge.',
            'The interrupt is triggered on a falling edge.',
            'The interrupt is triggered on the falling edge.',
            'The interrupt fires at the falling edge.',
            'The interrupt is triggered at the falling edge.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u8-d3-a9',
          kaynak: 'Kesme işleyicisini kısa tut.',
          cevaplar: [
            'Keep the interrupt handler short.',
            'Keep the ISR short.',
            'Keep the interrupt service routine short.',
            'Keep the handler short.',
            'Keep the interrupt handler brief.',
            'Keep interrupt handlers short.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u8-d3-a10',
          metin: `volatile uint32_t ticks = 0;

/* TIM2 overflows every 1 ms. */
void TIM2_IRQHandler(void) {
    clear_update_flag(TIM2);
    ticks++;
}`,
          soru: 'ticks starts at zero. Roughly what is its value two seconds after the timer starts?',
          secenekler: ['2000', '200', '2'],
          dogru: 0,
          aciklama:
            'Zamanlayıcı her 1 ms’de taşar, yani saniyede 1000 kez kesme oluşur ve her seferinde ticks bir artar. İki saniyede yaklaşık 2000 olur. Değişken ISR içinde değiştiği için volatile tanımlanmıştır.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u8-d3-a11',
          cumle: 'The interrupt fires on the rising edge of the signal.',
          anlam: 'Kesme, sinyalin yükselen kenarında tetiklenir.',
          ipucu:
            'edge: "eç" değil, sonu yumuşak "c" ile "ec". rising: "RAY-zing", "s" burada "z" gibi. signal: "SİG-nıl".',
        },
      ],
    },
    {
      id: 'yazilim-u8-d4',
      baslik: 'Onaltılık, ikilik ve birimli sayıları sesli okumak',
      gorsel: '🔢',
      not: `Register değerlerini, adresleri ve ölçümleri toplantıda sesli okumak gerekir.

**Onaltılık (hex)**
- 0xFF → "zero x F F", "hex F F" ya da kısaca "F F"
- 0x1A → "zero x one A"; 0x80 → "zero x eight zero"
- Harflerin adları: A "ey", B "bii", C "sii", D "dii", E "ii", F "ef"

**İkilik (binary)**
- 0b1010 → "binary one zero one zero"; rakamlar tek tek söylenir
- **bit**, **byte** (8 bit), **nibble** (4 bit)
- **LSB / MSB**: en düşük / en yüksek anlamlı bit; bir biti **set** etmek 1, **clear** etmek 0 yapmaktır

**Ondalık ve birimler**
- 3.3 V → "three point three volts"; 0.5 → "zero point five" ya da "point five"
- 16 MHz → "sixteen megahertz"; 100 kHz → "one hundred kilohertz"
- 20 mA → "twenty milliamps"; 115200 baud → "one fifteen two hundred baud"

**Örnekler**
- Write zero x F F to the control register. — Kontrol register’ına 0xFF yaz.
- Bit seven is set. — Bit 7 set edilmiş, yani 1.
- The clock runs at sixteen megahertz. — Saat on altı megahertz’te çalışır.

**Sık yapılan hata:** Ondalık ayırıcıyı "comma" diye okumak ❌; İngilizcede "point" ✅ söylenir, yazıda da nokta kullanılır (3,3 değil 3.3). Bitler 0’dan sayılır: 8 bitlik bir byte’ta MSB "bit seven"dır, "bit eight" ❌ değil.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u8-d4-a1',
          ciftler: [
            ['hexadecimal', 'onaltılık'],
            ['binary', 'ikilik'],
            ['decimal', 'ondalık'],
            ['nibble', 'yarım bayt (4 bit)'],
            ['most significant bit', 'en yüksek anlamlı bit'],
            ['clear a bit', 'biti sıfırlamak'],
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u8-d4-a2',
          soru: 'How do engineers usually read 0x3C aloud?',
          secenekler: ['zero x three C', 'zero x thirty C', 'zero comma three C'],
          dogru: 0,
          aciklama:
            'Onaltılık sayıda her hane tek tek okunur: 3 "three", C "sii"; 0x öneki de "zero x" diye söylenir. "Thirty" ondalık bir sayının adıdır, oysa burada 3 tek bir hanedir. 0x’teki x de virgül değildir, "comma" okunmaz.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u8-d4-a3',
          soru: 'The board runs on three ___ three volts.',
          secenekler: ['point', 'comma', 'dot'],
          dogru: 0,
          aciklama:
            'İngilizcede ondalık ayırıcı "point" diye okunur: 3.3 V → "three point three volts". "Comma" Türkçedeki virgül alışkanlığından gelir; "dot" ise dosya adı, web adresi ve sürüm numarasında kullanılır (v1.2 → "one dot two"); ölçülen bir değerde değil.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u8-d4-a4',
          soru: 'In an 8-bit register, the most significant bit is bit ___.',
          secenekler: ['seven', 'eight', 'one'],
          dogru: 0,
          aciklama:
            'Bitler 0’dan numaralanır: 8 bitlik bir register’da bitler 0–7 arasıdır. En düşük anlamlı bit bit 0, en yüksek anlamlı bit bit 7’dir. Bit 8 dokuzuncu bit olurdu.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u8-d4-a5',
          cumle: 'Write zero x F F to the control register.',
          anlam: 'Kontrol register’ına 0xFF yaz.',
          celdiriciler: ['hex', 'eight', 'status'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u8-d4-a6',
          cumle: 'The clock runs at sixteen megahertz.',
          anlam: 'Saat on altı megahertz’te çalışır.',
          celdiriciler: ['sixty', 'kilohertz', 'on'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u8-d4-a7',
          cumle: 'Bit seven of the status register is set.',
          anlam: 'Durum register’ında bit 7 set edilmiş (1).',
          ipucu:
            'register: "RE-cis-tır", vurgu ilk hecede. status: "STEY-tıs" ya da "STA-tıs"; ikisi de doğru.',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u8-d4-a8',
          kaynak: 'Saat sekiz megahertz’te çalışır.',
          cevaplar: [
            'The clock runs at eight megahertz.',
            'The clock runs at 8 megahertz.',
            'The clock runs at 8 MHz.',
            'The clock runs at eight MHz.',
            'The clock operates at eight megahertz.',
            'The clock operates at 8 MHz.',
            'The clock is running at eight megahertz.',
            'The clock is running at 8 MHz.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u8-d4-a9',
          kaynak: 'En düşük anlamlı biti sıfırla.',
          cevaplar: [
            'Clear the least significant bit.',
            'Clear the LSB.',
            'Reset the least significant bit.',
            'Reset the LSB.',
            'Set the least significant bit to zero.',
            'Set the LSB to zero.',
            'Set the least significant bit to 0.',
            'Set the LSB to 0.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u8-d4-a10',
          metin: `STATUS register (offset 0x04), reset value 0x00
Bit 7  BUSY  1 = conversion in progress
Bit 1  OVF   1 = overflow occurred
Bit 0  RDY   1 = new data ready
Other bits are reserved and read as 0.`,
          soru: 'You read 0x81 from STATUS. Which statement is true?',
          secenekler: [
            'A conversion is in progress and new data is ready.',
            'An overflow occurred and new data is ready.',
            'Only the BUSY bit is set.',
          ],
          dogru: 0,
          aciklama:
            '0x81 ikilikte 1000 0001’dir: bit 7 (BUSY) ve bit 0 (RDY) 1, geri kalanlar 0. Yani dönüşüm sürüyor ve yeni veri hazır. OVF bit 1’dedir ve 0; yalnızca BUSY olsaydı değer 0x80 olurdu.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u8-d4-a11',
          cumle: 'The least significant bit is bit zero.',
          anlam: 'En düşük anlamlı bit, bit 0’dır.',
          ipucu:
            'significant: "sig-Nİ-fi-kınt", vurgu ikinci hecede. least: "liist", uzun "i" ile. zero: "Zİİ-rou".',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────── ÜNİTE 9 — B1
const U9: Unite = {
  id: 'yazilim-u9',
  seviye: 'B1',
  baslik: 'Web, HTTP ve veritabanları',
  gorsel: '🌐',
  ozet: 'HTTP yöntemlerini ve durum kodlarını sözle anlatmak, JSON ve önbellek dili; sorgu, indeks, transaction ve migration konuşmak.',
  dersler: [
    {
      id: 'yazilim-u9-d1',
      baslik: 'HTTP yöntemleri ve durum kodları',
      gorsel: '📨',
      not: `HTTP konuşulurken yöntemler (method) ve durum kodları sürekli geçer. Kodlar sayı olarak ya da hane hane okunur; ortadaki sıfır çoğunlukla "oh" olur.

**Yöntemler**
- **GET**: veriyi okur; **POST**: yeni kayıt oluşturur
- **PUT**: kaydı bütünüyle değiştirir; **PATCH**: kısmen günceller; **DELETE**: siler
- **idempotent**: aynı istek kaç kez gönderilirse gönderilsin sunucudaki etkisi tek seferki ile aynıdır (GET, PUT, DELETE); dönen yanıt farklı olabilir, ör. ikinci DELETE 404 alabilir

**Durum kodlarını okumak**
- 200 → "two hundred" (OK); 201 → "two oh one" (Created)
- 401 → "four oh one" (Unauthorized: kimlik doğrulanmamış); 403 → "four oh three" (Forbidden: yetki yok)
- 404 → "four oh four" (Not Found); 429 → "four twenty-nine" (Too Many Requests)
- 500 → "five hundred"; 503 → "five oh three" (Service Unavailable)

**Örnekler**
- The endpoint returns a four oh four for unknown IDs. — Uç nokta bilinmeyen kimlikler için 404 döndürüyor.
- Send a POST request to create a new user. — Yeni kullanıcı oluşturmak için POST isteği gönder.
- PUT is idempotent, but POST is not. — PUT idempotenttir, POST değildir.

**Sık yapılan hata:** Türkçedeki "istek atmak" İngilizcede "throw a request" ❌ olmaz; "throw" hata (exception) için kullanılır. Doğrusu "send a request" ✅ ya da "make a request" ✅.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u9-d1-a1',
          ciftler: [
            ['request', 'istek'],
            ['response', 'yanıt'],
            ['status code', 'durum kodu'],
            ['method', 'yöntem'],
            ['Not Found', 'bulunamadı'],
            ['Forbidden', 'erişim yasak'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u9-d1-a2',
          soru: 'Use ___ to read the list of runs without changing anything on the server.',
          secenekler: ['GET', 'POST', 'DELETE'],
          dogru: 0,
          aciklama:
            'Sunucuda hiçbir şeyi değiştirmeden veri okumak GET’in işidir. POST yeni kayıt oluşturur, DELETE kayıt siler; ikisi de sunucudaki durumu değiştirir.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u9-d1-a3',
          gorsel: '🚦',
          soru: 'The client sent too many requests in one minute, so the server returned a ___.',
          secenekler: ['four twenty-nine', 'four oh four', 'two oh one'],
          dogru: 0,
          aciklama:
            '429 (Too Many Requests), istemci istek sınırını aştığında döner. 404 kaynağın bulunamadığını, 201 ise yeni bir kaydın oluşturulduğunu bildirir.',
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u9-d1-a4',
          soru: 'Which sentence is correct?',
          secenekler: [
            'The frontend throws a request to the API.',
            'The frontend sends a request to the API.',
            'The frontend does a request to the API.',
          ],
          dogru: 1,
          aciklama:
            'İstek "send" ya da "make" ile kurulur. "Throw" exception için kullanılır ("throws an error"); "do a request" ise doğal bir İngilizce eşdizim değildir.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u9-d1-a5',
          cumle: 'The endpoint returns a four oh four for unknown IDs.',
          anlam: 'Uç nokta bilinmeyen kimlikler için 404 döndürüyor.',
          celdiriciler: ['forty', 'zero', 'known'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u9-d1-a6',
          cumle: 'Send a POST request to create a new user.',
          anlam: 'Yeni kullanıcı oluşturmak için POST isteği gönder.',
          celdiriciler: ['throw', 'GET', 'users'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u9-d1-a7',
          cumle: 'The payment service keeps returning server errors.',
          anlam: 'Ödeme servisi sürekli sunucu hatası döndürüyor.',
          ipucu:
            'returning: "ri-TÖR-ning", vurgu ikinci hecede. errors: "E-rırz"; iki "r" arasındaki "o" belirsiz bir "ı" gibi okunur. "keep + -ing" sürekli tekrarlanan durumu anlatır.',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u9-d1-a8',
          kaynak: 'Yeni kullanıcı oluşturmak için bir POST isteği gönder.',
          cevaplar: [
            'Send a POST request to create a new user.',
            'Make a POST request to create a new user.',
            'Send a POST to create a new user.',
            'To create a new user, send a POST request.',
            'To create a new user, make a POST request.',
            'Send a POST request in order to create a new user.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u9-d1-a9',
          kaynak: 'Uç nokta 404 döndürüyor.',
          cevaplar: [
            'The endpoint is returning a 404.',
            'The endpoint is returning 404.',
            'The endpoint returns a 404.',
            'The endpoint returns 404.',
            'The endpoint is returning a 404 error.',
            'The endpoint returns a 404 error.',
            'The endpoint is returning a four oh four.',
            'The endpoint returns a four oh four.',
            'The endpoint is returning a four oh four error.',
            'The endpoint returns a four oh four error.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u9-d1-a10',
          metin: `10:42:01  GET     /api/runs/88   200   12 ms
10:42:03  POST    /api/runs      201   40 ms
10:42:05  DELETE  /api/runs/88   403    3 ms
10:42:06  GET     /api/runs/91   404    4 ms`,
          soru: 'What happened to the DELETE request?',
          secenekler: [
            'The user was not allowed to delete run 88.',
            'The server could not find run 88.',
            'Run 88 was deleted successfully.',
          ],
          dogru: 0,
          aciklama:
            'DELETE satırında 403 (Forbidden) var: sunucu isteği anladı ama bu kullanıcıya izin vermedi. Kayıt bulunamasaydı 404 dönerdi; 404 son satırda, run 91 için. Başarılı bir silme 200 ya da 204 döndürürdü.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u9-d1-a11',
          cumle: 'PUT is idempotent, but POST is not.',
          anlam: 'PUT idempotenttir, POST değildir.',
          ipucu:
            'idempotent: en yaygın okunuş "ay-dım-POU-tınt", vurgu "po" hecesinde. PUT kısa "u" ile "put" okunur, "pat" değil.',
        },
      ],
    },
    {
      id: 'yazilim-u9-d2',
      baslik: 'JSON, başlıklar ve önbellek',
      gorsel: '📦',
      not: `API yanıtları çoğunlukla **JSON** biçimindedir ("CEY-sın" okunur). Sık geçen kelimeler:

- **object** { }: nesne; **array** [ ]: dizi; **key / value**: anahtar / değer; **field**: alan
- **nested**: iç içe; **payload**: taşınan veri, yük
- **parse**: metni ayrıştırıp nesneye çevirmek; **serialize**: nesneyi metne çevirmek
- **header**: HTTP başlığı, ör. Content-Type: application/json

**Önbellek (cache)**
- **cache hit / cache miss**: veri önbellekte bulundu / bulunamadı
- **stale**: bayat, güncelliğini yitirmiş
- **invalidate**: önbellekteki kaydı geçersiz kılmak
- **TTL** (time to live): kaydın önbellekte kalma süresi

**Kalıp:** "The response is cached for five minutes."

- The run object has a nested battery field. — Run nesnesinin iç içe bir battery alanı var.
- The client fails to parse the response. — İstemci yanıtı ayrıştıramıyor.
- Most requests are cache hits. — İsteklerin çoğu önbellekten karşılanıyor.
- We invalidate the cache when the user updates their profile. — Kullanıcı profilini güncellediğinde önbelleği geçersiz kılıyoruz.

**Sık yapılan hata:** Süre "during" ile değil "for" ile verilir: "cached during five minutes" ❌ → "cached for five minutes" ✅. "Cache" de tek hecedir ve "cash" (nakit) gibi okunur: "keş"; "kaşe" ❌ değil.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u9-d2-a1',
          ciftler: [
            ['key', 'anahtar'],
            ['value', 'değer'],
            ['nested', 'iç içe'],
            ['payload', 'taşınan veri (yük)'],
            ['cache miss', 'önbellekte bulunamama'],
            ['stale', 'bayat (güncel olmayan)'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u9-d2-a2',
          metin: `{
  "id": 42,
  "name": "Pod Alpha",
  "battery": { "voltage": 48.2, "temperature": 31 }
}`,
          soru: 'In this JSON, "battery" is a ___ object.',
          secenekler: ['nested', 'stale', 'cached'],
          dogru: 0,
          aciklama:
            '"battery" başka bir nesnenin içinde duran bir nesnedir, yani iç içe (nested). Stale ve cached verinin önbellekteki durumunu anlatır; JSON’un yapısını değil.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u9-d2-a3',
          soru: 'The data was already in the cache, so the request was a cache ___.',
          secenekler: ['hit', 'miss', 'stale'],
          dogru: 0,
          aciklama:
            'Veri önbellekte bulunduysa "cache hit" olur. "Cache miss" bulunamadığı durumdur; "stale" ise bir sıfattır, "cache stale" diye bir terim yoktur.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u9-d2-a4',
          soru: 'The response is cached ___ five minutes.',
          secenekler: ['for', 'during', 'since'],
          dogru: 0,
          aciklama:
            'Ne kadar sürdüğünü "for" ile söyleriz: "for five minutes". "During" bir dönemin ya da olayın adını ister ("during the deploy"); "since" ise başlangıç anını gösterir ("since 10:00").',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u9-d2-a5',
          cumle: 'The client fails to parse the response.',
          anlam: 'İstemci yanıtı ayrıştıramıyor.',
          celdiriciler: ['pass', 'fail', 'request'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u9-d2-a6',
          cumle: 'We invalidate the cache when the user updates their profile.',
          anlam: 'Kullanıcı profilini güncellediğinde önbelleği geçersiz kılıyoruz.',
          celdiriciler: ['cash', 'validate', 'update'],
          aciklama: '"Cache" ve "cash" aynı okunur; bağlamdan ayırt edilir.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u9-d2-a7',
          cumle: 'Most requests are cache hits.',
          anlam: 'İsteklerin çoğu önbellekten karşılanıyor.',
          ipucu:
            'cache: tek hece, "keş"; "cash" ile aynı. requests: "ri-KUESTS", sondaki "sts" sesleri birlikte söylenir.',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u9-d2-a8',
          kaynak: 'Yanıt beş dakika boyunca önbellekte tutulur.',
          cevaplar: [
            'The response is cached for five minutes.',
            'The response is cached for 5 minutes.',
            'The response is kept in the cache for five minutes.',
            'The response is kept in the cache for 5 minutes.',
            'The response is stored in the cache for five minutes.',
            'The response is stored in the cache for 5 minutes.',
            'The response stays in the cache for five minutes.',
            'The response stays in the cache for 5 minutes.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u9-d2-a9',
          kaynak: 'İstemci yanıtı ayrıştıramıyor.',
          cevaplar: [
            "The client can't parse the response.",
            'The client fails to parse the response.',
            'The client is unable to parse the response.',
            'The client is failing to parse the response.',
            "The client isn't able to parse the response.",
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u9-d2-a10',
          metin: `HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=300
ETag: "a91f"`,
          soru: 'For how long can a client reuse this response without asking the server again?',
          secenekler: ['Five minutes', 'Three hundred minutes', 'Thirty seconds'],
          dogru: 0,
          aciklama:
            'max-age saniye cinsindendir: 300 saniye = 5 dakika. Bu süre dolunca istemci ETag ile sunucuya "değişti mi?" diye sorabilir.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u9-d2-a11',
          cumle: 'The data was stale because the TTL was too long.',
          anlam: 'TTL fazla uzun olduğu için veri bayattı.',
          ipucu: 'stale: tek hece, "steyl". TTL harf harf okunur: "ti-ti-el".',
        },
      ],
    },
    {
      id: 'yazilim-u9-d3',
      baslik: 'Veritabanı: sorgu, indeks, transaction ve migration',
      gorsel: '🗄️',
      not: `Veritabanı konuşmalarında terimler Türkçede de çoğunlukla İngilizce söylenir; önemli olan doğru fiil.

- **query**: sorgu; **run a query**: sorgu çalıştırmak
- **table / row / column**: tablo / satır / sütun
- **primary key / foreign key**: birincil anahtar / yabancı anahtar
- **index**: indeks; **add an index on** a column: bir sütuna indeks eklemek
- **full table scan**: tablonun baştan sona taranması
- **transaction**: hep birlikte uygulanan ya da hiç uygulanmayan işlemler bütünü; **commit**: kalıcı hale getirmek; **roll back**: geri almak
- **migration**: veritabanı şemasını değiştiren betik; **schema**: şema ("SKİİ-mı")

**Kalıp:** "The query is slow because there is no index on the email column."

- Let’s add an index on the email column. — Email sütununa indeks ekleyelim.
- If one step fails, the whole transaction is rolled back. — Bir adım başarısız olursa bütün transaction geri alınır.
- The migration adds a new column to the users table. — Migration, users tablosuna yeni bir sütun ekliyor.

**Sık yapılan hata:** "query"nin çoğulu "queries" ✅, "querys" ❌. "Index"in çoğulu veritabanı bağlamında genellikle "indexes" ✅ olur. "SQL" ise iki türlü okunur: harf harf "es-kyu-el" ya da "SİİK-wıl" (sequel); ikisi de doğrudur.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u9-d3-a1',
          ciftler: [
            ['row', 'satır'],
            ['column', 'sütun'],
            ['primary key', 'birincil anahtar'],
            ['foreign key', 'yabancı anahtar'],
            ['full table scan', 'tam tablo taraması'],
            ['schema', 'şema'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u9-d3-a2',
          gorsel: '🐢',
          soru: 'The query is slow because there is no ___ on the email column.',
          secenekler: ['index', 'transaction', 'migration'],
          dogru: 0,
          aciklama:
            'Bir sütunda arama yavaşsa ilk bakılacak şey o sütunda indeks olup olmadığıdır. Transaction işlemleri gruplar, migration şemayı değiştirir; ikisi de "bir sütunun üzerinde" duran şeyler değildir.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u9-d3-a3',
          soru: 'If one step fails, the database rolls ___ the whole transaction.',
          secenekler: ['back', 'up', 'out'],
          dogru: 0,
          aciklama:
            '"Roll back" geri almaktır: transaction’daki hiçbir değişiklik kalıcı olmaz. "Roll out" yeni bir sürümü yaygınlaştırmak, "roll up" ise verileri özetleyip toplamak demektir.',
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u9-d3-a4',
          soru: 'A transaction is "atomic". What does that mean?',
          secenekler: [
            'Either all of its changes are applied, or none of them are.',
            'It always runs faster than a single query.',
            'It can change only one row at a time.',
          ],
          dogru: 0,
          aciklama:
            'Atomic (bölünmez), transaction’ın ya bütünüyle uygulandığını ya da hiç uygulanmadığını söyler; yarım kalan değişiklik olmaz. Hızla ya da satır sayısıyla ilgisi yoktur.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u9-d3-a5',
          cumle: 'This query does a full table scan.',
          anlam: 'Bu sorgu tablonun tamamını tarıyor.',
          celdiriciler: ['scans', 'tables', 'fool'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u9-d3-a6',
          cumle: 'The migration adds a new column to the users table.',
          anlam: 'Migration, users tablosuna yeni bir sütun ekliyor.',
          celdiriciler: ['add', 'row', 'user'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u9-d3-a7',
          cumle: "Let's add an index on the email column.",
          anlam: 'Email sütununa indeks ekleyelim.',
          ipucu:
            'column: "KA-lım"; sondaki "n" okunmaz. index: "İN-deks", vurgu ilk hecede. email: "İİ-meyl".',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u9-d3-a8',
          kaynak: 'Email sütununda indeks yok.',
          cevaplar: [
            'There is no index on the email column.',
            "There isn't an index on the email column.",
            'The email column has no index.',
            "The email column doesn't have an index.",
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u9-d3-a9',
          kaynak: 'Migration’ı çalıştırdın mı?',
          cevaplar: [
            'Did you run the migration?',
            'Have you run the migration?',
            'Did you apply the migration?',
            'Have you applied the migration?',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u9-d3-a10',
          metin: `EXPLAIN ANALYZE SELECT * FROM runs WHERE pod_id = 7;

Seq Scan on runs  (actual rows=40 loops=1)
  Filter: (pod_id = 7)
  Rows Removed by Filter: 1199960
Execution Time: 840.512 ms`,
          soru: 'What is the most likely fix for this slow query?',
          secenekler: [
            'Add an index on pod_id.',
            'Roll back the last transaction.',
            'Increase the cache TTL.',
          ],
          dogru: 0,
          aciklama:
            '"Seq Scan" (sequential scan) tablonun baştan sona tarandığını gösterir: 40 satır bulmak için yaklaşık 1,2 milyon satır okunup filtreyle elenmiş. pod_id üzerinde indeks olsaydı veritabanı yalnızca eşleşen satırlara gidebilirdi. Bir transaction’ı geri almak ya da önbellek süresi bu sorgunun planını değiştirmez.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u9-d3-a11',
          cumle: 'If one step fails, the whole transaction is rolled back.',
          anlam: 'Bir adım başarısız olursa bütün transaction geri alınır.',
          ipucu:
            'transaction: "tren-ZEK-şın", vurgu ikinci hecede. rolled: tek hece, "rould". whole: "houl"; "w" okunmaz.',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────── ÜNİTE 10 — B2
const U10: Unite = {
  id: 'yazilim-u10',
  seviye: 'B2',
  baslik: 'Güvenlik, test ve DevOps',
  gorsel: '🛡️',
  ozet: 'Kimlik doğrulama ve yetkilendirme, güvenlik açığı dili; test türleri ve CI/CD hattı; canlıya alma, geri alma, olay yönetimi ve postmortem.',
  dersler: [
    {
      id: 'yazilim-u10-d1',
      baslik: 'Kimlik doğrulama, yetkilendirme ve güvenlik açıkları',
      gorsel: '🔐',
      not: `Güvenlik konuşmalarında en çok karıştırılan çift **authentication** ve **authorization**dır.

- **authentication**: kimlik doğrulama; "Sen kimsin?" (parola, token, parmak izi)
- **authorization**: yetkilendirme; "Bunu yapmaya iznin var mı?"
- **credentials**: kimlik bilgileri (kullanıcı adı ve parola, API anahtarı)
- **vulnerability**: güvenlik açığı, zafiyet; **exploit**: açığı istismar etmek
- **injection**: enjeksiyon; ör. SQL injection, kullanıcı girdisinin sorgunun parçası gibi çalıştırılması
- **validate / sanitize input**: girdiyi doğrulamak / zararsız hale getirmek
- **least privilege**: en az yetki ilkesi; her hesaba yalnızca işi için gereken izin verilir

**Kalıp:** "X is vulnerable to Y." / "This allows an attacker to ..."

- The login form is vulnerable to SQL injection. — Giriş formu SQL enjeksiyonuna açık.
- Use parameterized queries to prevent SQL injection. — SQL enjeksiyonunu önlemek için parametreli sorgular kullanın.
- A valid token is not enough; the user also needs the admin role. — Geçerli bir token yetmez; kullanıcının admin rolü de olmalı.

**Sık yapılan hata:** "vulnerable for" ❌ → "vulnerable to" ✅. "Security" de tek başına sayılmaz: "We found a security" ❌ → "We found a security issue" ✅ ya da "a vulnerability" ✅.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u10-d1-a1',
          ciftler: [
            ['authentication', 'kimlik doğrulama'],
            ['authorization', 'yetkilendirme'],
            ['vulnerability', 'güvenlik açığı'],
            ['credentials', 'kimlik bilgileri'],
            ['least privilege', 'en az yetki ilkesi'],
            ['attacker', 'saldırgan'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u10-d1-a2',
          soru: 'Checking the user’s password is part of ___.',
          secenekler: ['authentication', 'authorization', 'injection'],
          dogru: 0,
          aciklama:
            'Parola kontrolü kullanıcının kim olduğunu doğrular: authentication. Authorization, kimliği doğrulanmış kullanıcının neye izni olduğunu belirler; injection ise bir saldırı türüdür.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u10-d1-a3',
          soru: 'She is logged in, but she isn’t allowed to delete runs. Her request fails ___.',
          secenekler: ['authorization', 'authentication', 'injection'],
          dogru: 0,
          aciklama:
            'Oturum açık olduğuna göre kimlik doğrulanmış (authentication geçti); kayıt silme izni yok, yani yetkilendirmeden (authorization) kalıyor. "Fail injection" anlamsızdır.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u10-d1-a4',
          soru: 'The search form is vulnerable ___ SQL injection.',
          secenekler: ['to', 'for', 'against'],
          dogru: 0,
          aciklama:
            '"Vulnerable" her zaman "to" ile kullanılır: "vulnerable to SQL injection". "For" ve "against" bu sıfatla kullanılmaz; korunmayı anlatırken "protected against" denir.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u10-d1-a5',
          cumle: 'Use parameterized queries to prevent SQL injection.',
          anlam: 'SQL enjeksiyonunu önlemek için parametreli sorgular kullanın.',
          celdiriciler: ['protect', 'query', 'inject'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u10-d1-a6',
          cumle: 'The service account has more permissions than it needs.',
          anlam: 'Servis hesabının ihtiyacından fazla izni var.',
          celdiriciler: ['then', 'permission', 'need'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u10-d1-a7',
          cumle: 'Authentication checks who you are.',
          anlam: 'Kimlik doğrulama kim olduğunu kontrol eder.',
          ipucu:
            'authentication: "o-then-ti-KEY-şın", vurgu "key" hecesinde. "th" için dil ucunu dişlerin arasına koyun; "t" demeyin.',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u10-d1-a8',
          kaynak: 'Giriş formu SQL enjeksiyonuna açık.',
          cevaplar: [
            'The login form is vulnerable to SQL injection.',
            'The login form is open to SQL injection.',
            'The login form is susceptible to SQL injection.',
            'The sign-in form is vulnerable to SQL injection.',
            'The sign-in form is open to SQL injection.',
            'The login form is vulnerable to SQL injection attacks.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u10-d1-a9',
          kaynak: 'Geçerli bir token yetmez.',
          cevaplar: [
            'A valid token is not enough.',
            'A valid token is not sufficient.',
            'Having a valid token is not enough.',
            'A valid token alone is not enough.',
            'A valid token is not enough on its own.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u10-d1-a10',
          metin: `Security advisory — telemetry panel
Affected versions: 2.0.0 to 2.2.4
Fixed in: 2.2.5
Description: The export endpoint checked that the user was logged in, but it did not check the user's role. Any logged-in user could download every team's data.`,
          soru: 'What kind of flaw does the advisory describe?',
          secenekler: ['An authorization flaw', 'An authentication flaw', 'An injection flaw'],
          dogru: 0,
          aciklama:
            'Uç nokta oturumu (kimliği) kontrol ediyordu, yani authentication çalışıyordu; eksik olan rol kontrolüydü, yani kullanıcının bu veriye erişme izni. Bu bir authorization açığıdır. Metinde girdinin sorguya karışmasından söz edilmiyor, yani injection değil.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u10-d1-a11',
          cumle: 'Give the service account only the permissions it needs.',
          anlam: 'Servis hesabına yalnızca ihtiyacı olan izinleri ver.',
          ipucu: 'permissions: "pır-Mİ-şınz", vurgu ikinci hecede. account: "ı-KAUNT".',
        },
      ],
    },
    {
      id: 'yazilim-u10-d2',
      baslik: 'Testler ve CI/CD hattı',
      gorsel: '🧪',
      not: `Test konuşmalarında fiiller önemlidir: test "pass" ya da "fail" eder; hat (pipeline) "green" ya da "red" olur.

- **unit test**: birim testi; tek bir fonksiyonu yalıtılmış olarak dener
- **integration test**: entegrasyon testi; birden çok parçanın birlikte çalışmasını dener
- **end-to-end (E2E) test**: uçtan uca test; sistemi kullanıcı gibi baştan sona dener
- **mock**: sahte nesne (gerçek bağımlılığın yerine geçer)
- **flaky test**: kod değişmeden bazen geçip bazen kalan, güvenilmez test
- **coverage**: test kapsamı; kodun ne kadarının testlerle çalıştırıldığı
- **CI/CD pipeline**: sürekli entegrasyon ve teslim hattı; **stage**: aşama

**Kalıp:** "The tests pass locally but fail on CI."

- All unit tests pass. — Bütün birim testleri geçiyor.
- The integration tests fail on CI. — Entegrasyon testleri CI’da kalıyor.
- This test is flaky; it fails about once every ten runs. — Bu test güvenilmez; yaklaşık on çalıştırmada bir kalıyor.
- The pipeline is red, so the merge is blocked. — Hat kırmızı, bu yüzden birleştirme engellendi.

**Sık yapılan hata:** Testin kendisi geçer: "The test is passed" ❌ → "The test passes" ✅ ya da "The test passed" ✅. "CI/CD" harf harf okunur: "si-ay si-di".`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u10-d2-a1',
          ciftler: [
            ['unit test', 'birim testi'],
            ['integration test', 'entegrasyon testi'],
            ['end-to-end test', 'uçtan uca test'],
            ['flaky test', 'güvenilmez (kararsız) test'],
            ['coverage', 'test kapsamı'],
            ['mock', 'sahte nesne'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u10-d2-a2',
          soru: 'A test that checks a single function in isolation is a ___ test.',
          secenekler: ['unit', 'integration', 'end-to-end'],
          dogru: 0,
          aciklama:
            'Tek bir birimi yalıtılmış olarak deneyen test unit test’tir. Integration test birden çok parçayı birlikte, end-to-end test ise bütün sistemi kullanıcı gözünden dener.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u10-d2-a3',
          soru: 'The test passes on my machine but ___ on CI.',
          secenekler: ['fails', 'is failed', 'failing'],
          dogru: 0,
          aciklama:
            '"Passes" ile paralel olarak geniş zaman gerekir: "fails". Test kendisi kalır, edilgen "is failed" kullanılmaz; "failing" ise yardımcı fiil olmadan tek başına yüklem olamaz.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u10-d2-a4',
          soru: 'This test sometimes passes and sometimes fails, even when nothing changes. It is ___.',
          secenekler: ['flaky', 'stale', 'idempotent'],
          dogru: 0,
          aciklama:
            'Kod değişmeden sonucu değişen teste "flaky" denir. Stale bayat veri için, idempotent ise tekrarlandığında sonucu değişmeyen işlem için kullanılır; bu durumun tam tersi.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u10-d2-a5',
          cumle: 'The tests pass locally but fail on CI.',
          anlam: 'Testler yerelde geçiyor ama CI’da kalıyor.',
          celdiriciler: ['passed', 'failed', 'local'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u10-d2-a6',
          cumle: 'The pipeline is red, so the merge is blocked.',
          anlam: 'Hat kırmızı, bu yüzden birleştirme engellendi.',
          celdiriciler: ['green', 'block', 'merged'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u10-d2-a7',
          cumle: 'All unit tests pass on the main branch.',
          anlam: 'Ana dalda bütün birim testleri geçiyor.',
          ipucu:
            'unit: "YU-nit"; başta "y" sesi var, Türkçedeki gibi "u-nit" okumayın. branch: "brenç".',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u10-d2-a8',
          kaynak: 'Bütün birim testleri geçiyor.',
          cevaplar: [
            'All unit tests pass.',
            'All the unit tests pass.',
            'All of the unit tests pass.',
            'All unit tests are passing.',
            'All the unit tests are passing.',
            'All of the unit tests are passing.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u10-d2-a9',
          kaynak: 'Hat kırmızı, bu yüzden birleştirme engellendi.',
          cevaplar: [
            'The pipeline is red, so the merge is blocked.',
            'The pipeline is red, so the merge was blocked.',
            'The pipeline is red, so the merge has been blocked.',
            'The pipeline is red, so merging is blocked.',
            'The pipeline is red, so merging was blocked.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u10-d2-a10',
          metin: `Pipeline #418 — branch: feat/brake-telemetry
✔ lint           12 s
✔ unit tests     1 m 40 s   (312 passed)
✘ integration    4 m 05 s   (2 failed, 57 passed)
– deploy         skipped`,
          soru: 'Why was the deploy stage skipped?',
          secenekler: [
            'Two integration tests failed.',
            'The unit tests took too long.',
            'The linter found errors.',
          ],
          dogru: 0,
          aciklama:
            'Integration aşaması ✘ ile bitmiş (2 failed); hat kırıldığı için sonraki deploy aşaması çalıştırılmamış. Lint ve unit tests ✔ ile geçmiş; süre sınırına dair bir şey yazmıyor.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u10-d2-a11',
          cumle: 'This test is flaky and fails about once every ten runs.',
          anlam: 'Bu test güvenilmez; yaklaşık on çalıştırmada bir kalıyor.',
          ipucu: 'flaky: "FLEY-ki". once: "uans"; "o" ile değil "u" sesiyle başlar.',
        },
      ],
    },
    {
      id: 'yazilim-u10-d3',
      baslik: 'Canlıya alma, geri alma ve postmortem',
      gorsel: '🚨',
      not: `Canlıya çıkışta ve arıza anında kısa, net cümleler kurulur.

- **deploy**: canlıya almak (fiil); **deployment**: dağıtım (isim)
- **release**: sürüm; sürüm çıkarmak
- **roll back** (fiil, ayrı): geri almak; **rollback** (isim, bitişik): geri alma
- **feature flag**: bir özelliği kod değiştirmeden açıp kapatan anahtar
- **canary (release)**: yeni sürümün önce küçük bir sunucu ya da kullanıcı grubuna verilmesi
- **alert / dashboard**: uyarı / izleme paneli; **on-call**: nöbetçi
- **incident**: olay; **outage**: kesinti; **mitigate**: etkisini azaltmak
- **postmortem**: olay sonrası rapor; **action items**: yapılacak işler

**Kalıp:** Postmortem geçmiş zamanla ve kimseyi suçlamadan (blameless) yazılır: "At 14:05 an alert fired. At 14:11 we started the rollback."

- We deployed version two point four to production. — 2.4 sürümünü canlıya aldık.
- Error rates spiked, so we rolled back. — Hata oranları fırladı, geri aldık.
- We mitigated the issue by turning off the feature flag. — Feature flag’i kapatarak sorunun etkisini azalttık.

**Sık yapılan hata:** Fiil ile isim karıştırılır: "We rollbacked" ❌ → "We rolled back" ✅; "The roll back took ten minutes" ❌ → "The rollback took ten minutes" ✅. Aynı ayrım "set up / setup" ve "log in / login" için de geçerlidir.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u10-d3-a1',
          ciftler: [
            ['outage', 'kesinti'],
            ['on-call', 'nöbetçi'],
            ['alert', 'uyarı'],
            ['rollback', 'geri alma'],
            ['mitigate', 'etkisini azaltmak'],
            ['postmortem', 'olay sonrası rapor'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u10-d3-a2',
          soru: 'Error rates went up right after the release, so we rolled ___ to the previous version.',
          secenekler: ['back', 'out', 'over'],
          dogru: 0,
          aciklama:
            'Önceki sürüme dönmek "roll back"tir. "Roll out" yeni sürümü yaygınlaştırmaktır, yani tam tersi; "roll over" ise devretmek ya da (sayaç için) başa dönmek anlamına gelir.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u10-d3-a3',
          soru: 'The ___ took only ten minutes, and the old version was back in production.',
          secenekler: ['rollback', 'roll back', 'rolled back'],
          dogru: 0,
          aciklama:
            'Boşluk "the" ile başlayan bir isim istiyor: bitişik yazılan "rollback". Ayrı yazılan "roll back" fiildir, "rolled back" da fiilin geçmiş hali; ikisi de özne olamaz.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u10-d3-a4',
          soru: 'We ___ the issue by turning off the feature flag, and fixed the root cause the next day.',
          secenekler: ['mitigated', 'deployed', 'monitored'],
          dogru: 0,
          aciklama:
            'Feature flag’i kapatmak sorunu kökten çözmez, etkisini hemen azaltır: mitigate. Kalıcı düzeltme ertesi gün gelmiş. "Deployed the issue" anlamsızdır; "monitored" yalnızca izlemek demektir, sorunu hafifletmez.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u10-d3-a5',
          cumle: 'Error rates spiked, so we rolled back.',
          anlam: 'Hata oranları fırladı, geri aldık.',
          celdiriciler: ['rollback', 'spike', 'errors'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u10-d3-a6',
          gorsel: '🔔',
          cumle: 'The alert fired at two in the morning.',
          anlam: 'Uyarı gece saat ikide çaldı.',
          celdiriciler: ['fire', 'night', 'alarm'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u10-d3-a7',
          cumle: 'We deployed the new version to production this morning.',
          anlam: 'Yeni sürümü bu sabah canlıya aldık.',
          ipucu:
            'deployed: "di-PLOYD"; sondaki "-ed" ayrı hece değildir. production: "prı-DAK-şın", vurgu ikinci hecede.',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u10-d3-a8',
          kaynak: 'Geri alma on dakika sürdü.',
          cevaplar: [
            'The rollback took ten minutes.',
            'The rollback took 10 minutes.',
            'Rolling back took ten minutes.',
            'Rolling back took 10 minutes.',
            'The rollback lasted ten minutes.',
            'The rollback lasted 10 minutes.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u10-d3-a9',
          kaynak: 'Dün gece bir kesinti yaşadık.',
          cevaplar: [
            'We had an outage last night.',
            'We experienced an outage last night.',
            'There was an outage last night.',
            'We had some downtime last night.',
            'Last night we had an outage.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u10-d3-a10',
          metin: `Postmortem: telemetry API outage (blameless)
14:02  v3.8 deployed to all servers
14:05  Alert: error rate 23% (normal: below 1%)
14:11  On-call engineer paged; rollback started
14:19  Rollback complete; error rate back to 0.4%
Root cause: a migration renamed a column that the API still used.
Action item: release new versions as a canary on 5% of servers first.`,
          soru: 'According to the timeline, how much time passed between the alert and the end of the rollback?',
          secenekler: ['14 minutes', '8 minutes', '17 minutes'],
          dogru: 0,
          aciklama:
            'Uyarı 14:05’te geldi, geri alma 14:19’da bitti: 14 dakika. 8 dakika yalnızca geri almanın süresidir (14:11–14:19); 17 dakika ise canlıya almadan (14:02) itibaren geçen süredir.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u10-d3-a11',
          cumle: "Let's write a blameless postmortem for this incident.",
          anlam: 'Bu olay için kimseyi suçlamayan bir postmortem yazalım.',
          ipucu:
            'postmortem: "poust-MOR-tım", vurgu ortadaki hecede. blameless: "BLEYM-lıs". incident: "İN-si-dınt".',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────── ÜNİTE 11 — C1
const U11: Unite = {
  id: 'yazilim-u11',
  seviye: 'C1',
  baslik: 'Tasarım dokümanı, mimari ve makale okuma',
  gorsel: '📐',
  ozet: 'Tasarım dokümanı ve RFC dilini kullanmak, mimariyi gecikme ve ölçeklenebilirlik gibi ölçütlerle tartışmak, makale özetlerini doğru yorumlamak.',
  dersler: [
    {
      id: 'yazilim-u11-d1',
      baslik: 'Tasarım dokümanı ve RFC: hedefler, kapsam dışı, ödünleşimler',
      gorsel: '📝',
      not: `Büyük bir değişiklikten önce ekipler bir **design doc** ya da **RFC** (request for comments) yazar. Bölüm başlıkları hemen hep aynıdır:

- **Background / Motivation**: arka plan; değişiklik neden gerekli
- **Goals**: hedefler; **Non-goals**: bilerek kapsam dışında bırakılanlar
- **Proposal / Detailed design**: önerilen çözüm
- **Alternatives considered**: değerlendirilip elenen seçenekler
- **Trade-offs**: ödünleşimler; bir şey kazanırken başka bir şeyden vazgeçmek
- **Open questions**: henüz yanıtlanmamış sorular

**Kalıplar ve örnekler**
- We chose MQTT over HTTP polling because it gives us publish-subscribe out of the box. — Yayınla-abone ol modelini hazır sunduğu için HTTP yoklaması yerine MQTT’yi seçtik.
- This comes at the cost of a more complex server. — Bunun bedeli daha karmaşık bir sunucu.
- Video streaming is out of scope for this proposal. — Video aktarımı bu önerinin kapsamı dışında.
- We considered raw UDP but rejected it. — Ham UDP’yi değerlendirdik ama eledik.

**Sık yapılan hata:** "Non-goal" kötü ya da başarısız hedef demek değildir; bilinçli olarak yapılmayacak iştir. İsim "trade-off" (tireli; "tradeoff" da yazılır), fiil "trade off" (ayrı) yazılır: "We had to trade off latency against simplicity." ✅`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u11-d1-a1',
          ciftler: [
            ['goals', 'hedefler'],
            ['non-goals', 'kapsam dışı bırakılanlar'],
            ['trade-off', 'ödünleşim'],
            ['alternatives considered', 'değerlendirilen seçenekler'],
            ['open questions', 'yanıt bekleyen sorular'],
            ['background', 'arka plan'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u11-d1-a2',
          soru: 'Mobile support is a ___ for this version; we will not work on it until next year.',
          secenekler: ['non-goal', 'goal', 'trade-off'],
          dogru: 0,
          aciklama:
            'Bilerek bu sürümün dışında bırakılan iş "non-goal"dur; cümlenin devamı da üzerinde çalışılmayacağını söylüyor. "Goal" bunun tam tersi olurdu; trade-off ise iki seçenek arasındaki ödünleşimdir, kapsam kararı değildir.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u11-d1-a3',
          soru: 'We chose PostgreSQL ___ MongoDB because our data is highly relational.',
          secenekler: ['over', 'than', 'against'],
          dogru: 0,
          aciklama:
            'Seçim karşılaştırması "choose X over Y" kalıbıyla yapılır. "Than" bir karşılaştırma sıfatı ister ("better than"), "chose" fiilinden sonra tek başına gelmez; "choose X against Y" de doğal bir İngilizce kalıp değildir.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u11-d1-a4',
          soru: 'Caching makes reads faster ___ the cost of sometimes serving stale data.',
          secenekler: ['at', 'for', 'with'],
          dogru: 0,
          aciklama:
            'Kalıp sabittir: "at the cost of" (… pahasına). "For the cost of" fiyat söylerken kullanılır ("for the cost of a coffee"), "with the cost of" ise bu anlamda kullanılmaz.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u11-d1-a5',
          cumle: 'We considered a message queue but rejected it.',
          anlam: 'Bir mesaj kuyruğunu değerlendirdik ama eledik.',
          celdiriciler: ['consider', 'rejecting', 'cue'],
          aciklama: '"Queue" (kuyruk) ile "cue" (işaret) aynı okunur: "kyuu".',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u11-d1-a6',
          cumle: 'Supporting multiple pods is out of scope for this proposal.',
          anlam: 'Birden çok pod desteği bu önerinin kapsamı dışında.',
          celdiriciler: ['scoop', 'purpose', 'pod'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u11-d1-a7',
          cumle: 'We chose this design over the alternatives because it is simpler.',
          anlam: 'Daha basit olduğu için diğer seçenekler yerine bu tasarımı seçtik.',
          ipucu:
            'alternatives: "ol-TÖR-nı-tivz", vurgu ikinci hecede. design: "di-ZAYN"; "s" burada "z" gibi okunur.',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u11-d1-a8',
          kaynak: 'Bu, bu önerinin kapsamı dışında.',
          cevaplar: [
            'This is out of scope for this proposal.',
            'This is outside the scope of this proposal.',
            'This is beyond the scope of this proposal.',
            "This is out of this proposal's scope.",
            'That is out of scope for this proposal.',
            'That is outside the scope of this proposal.',
            'That is beyond the scope of this proposal.',
            'This falls outside the scope of this proposal.',
            'It is out of scope for this proposal.',
            'It is outside the scope of this proposal.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u11-d1-a9',
          kaynak: 'Daha basit olduğu için gRPC yerine REST’i seçtik.',
          cevaplar: [
            'We chose REST over gRPC because it is simpler.',
            'We chose REST instead of gRPC because it is simpler.',
            'We chose REST rather than gRPC because it is simpler.',
            'We picked REST over gRPC because it is simpler.',
            'We picked REST instead of gRPC because it is simpler.',
            'We went with REST over gRPC because it is simpler.',
            'We went with REST instead of gRPC because it is simpler.',
            'Because it is simpler, we chose REST over gRPC.',
            'Because it is simpler, we chose REST instead of gRPC.',
            'We chose REST over gRPC since it is simpler.',
            'We chose REST over gRPC as it is simpler.',
            'We went with REST rather than gRPC because it is simpler.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u11-d1-a10',
          metin: `RFC-012: Telemetry transport
Goals
- Deliver sensor data to the ground station within 50 ms.
- Survive a 2-second network drop without losing data.
Non-goals
- Video streaming.
Alternatives considered
- Raw UDP: lowest latency, but we would have to build retransmission ourselves.
Decision: MQTT over TCP, with a local buffer on the pod.`,
          soru: 'Why was raw UDP rejected?',
          secenekler: [
            'The team would have to implement retransmission itself.',
            'Its latency is too high for the 50 ms goal.',
            'It cannot carry video streams.',
          ],
          dogru: 0,
          aciklama:
            'Metne göre UDP’nin gecikmesi en düşük olandır ("lowest latency"), yani gecikme sorun değil; sorun yeniden gönderimi (retransmission) ekibin kendisinin yazmak zorunda olması. Video ise zaten kapsam dışı (non-goal), karar gerekçesi değil.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u11-d1-a11',
          cumle: 'This simplifies the client at the cost of a more complex server.',
          anlam: 'Bu, sunucuyu karmaşıklaştırma pahasına istemciyi basitleştirir.',
          ipucu:
            'simplifies: "SİM-plı-fayz", vurgu ilk hecede. complex: sıfat olarak "kım-PLEKS" de "KAM-pleks" de duyulur; ikisi de doğru.',
        },
      ],
    },
    {
      id: 'yazilim-u11-d2',
      baslik: 'Mimariyi tartışmak: gecikme, işlem hacmi, ölçeklenebilirlik, bağlaşım',
      gorsel: '🏗️',
      not: `Mimari tartışmalarında ölçüt yanlış kelimeyle söylenirse anlam kayar.

- **latency**: gecikme; tek bir işlemin ne kadar sürdüğü (ms)
- **throughput**: işlem hacmi; birim zamanda kaç işlem yapıldığı (requests per second)
- **p99 latency**: isteklerin yüzde 99’unun altında kaldığı gecikme ("pi naynti-nayn" okunur)
- **scalability**: ölçeklenebilirlik; **scale horizontally / vertically**: daha çok makine ekleyerek / makineyi büyüterek ölçeklemek
- **bottleneck**: darboğaz
- **coupling**: bağlaşım (bileşenlerin birbirine ne kadar bağımlı olduğu); **tightly / loosely coupled**: sıkı / gevşek bağlı
- **single point of failure**: tek hata noktası

**Kalıp:** Ölçütler "high / low" ile nitelenir: "high throughput, low latency".

- The database is the bottleneck, not the API servers. — Darboğaz API sunucuları değil, veritabanı.
- We can scale the workers horizontally. — Worker’ları yatay olarak ölçekleyebiliriz.
- Batching increases throughput but adds latency. — Toplu işlemek işlem hacmini artırır ama gecikme ekler.

**Sık yapılan hata:** "The latency is fast" ❌ → "The latency is low" ✅. Gecikme bir süredir; hızlı ya da yavaş değil, düşük ya da yüksek olur. Aynı şekilde "the throughput is fast" ❌ → "the throughput is high" ✅.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u11-d2-a1',
          ciftler: [
            ['latency', 'gecikme'],
            ['throughput', 'işlem hacmi'],
            ['bottleneck', 'darboğaz'],
            ['scalability', 'ölçeklenebilirlik'],
            ['single point of failure', 'tek hata noktası'],
            ['loosely coupled', 'gevşek bağlı'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u11-d2-a2',
          soru: 'The API answers each request in about two milliseconds, so its ___ is low.',
          secenekler: ['latency', 'throughput', 'scalability'],
          dogru: 0,
          aciklama:
            'Tek bir isteğin süresi gecikmedir (latency); iki milisaniye düşük gecikmedir. Throughput birim zamandaki istek sayısıdır ve burada verilmemiş; "low scalability" da yanıt süresiyle ilgili değildir.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u11-d2-a3',
          soru: 'The service handles fifty thousand requests per second, so its ___ is very high.',
          secenekler: ['throughput', 'latency', 'coupling'],
          dogru: 0,
          aciklama:
            '"Requests per second" birim zamandaki işlem sayısıdır: throughput. Yüksek latency istekler yavaş demek olurdu ve saniyedeki istek sayısından çıkarılamaz; coupling ise bileşenler arası bağımlılıktır.',
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u11-d2-a4',
          soru: 'Which sentence is correct?',
          secenekler: [
            'After the change, the latency is fast.',
            'After the change, the latency is low.',
            'After the change, the latency is quick.',
          ],
          dogru: 1,
          aciklama:
            'Latency bir süredir; süre "low" ya da "high" olur. "Fast" ve "quick" sistemin ya da yanıtın niteliğidir: "the response is fast" ✅, "the latency is fast" ❌.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u11-d2-a5',
          cumle: 'The database is the bottleneck, not the API servers.',
          anlam: 'Darboğaz API sunucuları değil, veritabanı.',
          celdiriciler: ['bottle', 'service', 'neck'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u11-d2-a6',
          cumle: 'Batching increases throughput but adds latency.',
          anlam: 'Toplu işlemek işlem hacmini artırır ama gecikme ekler.',
          celdiriciler: ['through', 'decreases', 'add'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u11-d2-a7',
          cumle: 'We can scale the workers horizontally.',
          anlam: 'Worker’ları yatay olarak ölçekleyebiliriz.',
          ipucu: 'horizontally: "ho-rı-ZAN-tı-li", vurgu "zan" hecesinde. workers: "WÖR-kırz".',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u11-d2-a8',
          kaynak: 'Bu iki servis sıkı bağlı.',
          cevaplar: [
            'These two services are tightly coupled.',
            'These 2 services are tightly coupled.',
            'Those two services are tightly coupled.',
            'The two services are tightly coupled.',
            'These two services are strongly coupled.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u11-d2-a9',
          kaynak: 'Yük dengeleyici tek hata noktası.',
          cevaplar: [
            'The load balancer is a single point of failure.',
            'The load balancer is the single point of failure.',
            'The load balancer is a SPOF.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u11-d2-a10',
          metin: `Load test — ingest service (4 instances)
Requests/s   p50 latency   p99 latency   DB CPU
1,000         8 ms          21 ms        35%
4,000        11 ms          48 ms        78%
6,000        45 ms         910 ms        99%
API server CPU stayed below 40% in all runs.`,
          soru: 'What is the most reasonable conclusion?',
          secenekler: [
            'The database becomes the bottleneck at around 6,000 requests per second.',
            'Adding more API instances will fix the p99 latency at 6,000 requests per second.',
            'Throughput is limited by the API servers’ CPU.',
          ],
          dogru: 0,
          aciklama:
            'Saniyede 6.000 istekte veritabanı işlemcisi %99’a dayanıyor ve p99 gecikme 48 ms’den 910 ms’ye fırlıyor; API sunucularının işlemcisi ise %40’ın altında. Darboğaz veritabanı; API örneği eklemek onu rahatlatmaz.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u11-d2-a11',
          cumle: 'Loosely coupled services are easier to change and deploy.',
          anlam: 'Gevşek bağlı servisleri değiştirmek ve canlıya almak daha kolaydır.',
          ipucu:
            'loosely: "LUUS-li"; buradaki "s" sert okunur, "z" değil. coupled: "KA-pıld"; sondaki "-ed" ayrı hece değildir.',
        },
      ],
    },
    {
      id: 'yazilim-u11-d3',
      baslik: 'Makale özeti okumak: we propose, results indicate, limitations',
      gorsel: '📄',
      not: `Bir makalenin **abstract**’ı (özeti) çoğunlukla aynı sırayı izler: problem → önerilen yöntem → değerlendirme → sonuç → sınırlılık.

- **we propose / we present**: öneriyoruz / sunuyoruz (makalenin katkısı)
- **baseline**: karşılaştırma için kullanılan temel yöntem; **state of the art**: alandaki en iyi bilinen yöntem
- **outperform**: daha iyi sonuç vererek geride bırakmak
- **results indicate / suggest**: sonuçlar ... olduğuna işaret ediyor / olduğunu düşündürüyor
- **significantly**: makalede çoğunlukla "istatistiksel olarak anlamlı" demektir, yalnızca "çok" değil
- **limitations / future work**: sınırlılıklar / gelecek çalışmalar

**Kalıp:** İddianın gücünü fiil belirler: "results show" (güçlü) → "indicate" → "suggest" (temkinli).

- We propose a lightweight method for detecting sensor faults. — Sensör arızalarını tespit etmek için hafif bir yöntem öneriyoruz.
- Our model outperforms the baseline. — Modelimiz temel yöntemi geride bırakıyor.
- The results suggest that the method generalizes to other vehicles. — Sonuçlar, yöntemin başka araçlara da genellenebildiğini düşündürüyor.

**Sık yapılan hata:** "outperforms than the baseline" ❌ → "outperforms the baseline" ✅; outperform doğrudan nesne alır. "Than" ise "better" gibi karşılaştırma sıfatıyla gelir: "performs better than the baseline" ✅.`,
      alistirmalar: [
        {
          tur: 'eslestir',
          id: 'yazilim-u11-d3-a1',
          ciftler: [
            ['abstract', 'makale özeti'],
            ['baseline', 'temel (karşılaştırma) yöntemi'],
            ['limitations', 'sınırlılıklar'],
            ['future work', 'gelecek çalışmalar'],
            ['outperform', 'geride bırakmak'],
            ['dataset', 'veri kümesi'],
          ],
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u11-d3-a2',
          soru: 'In this paper, we ___ a new method for estimating battery health.',
          secenekler: ['propose', 'outperform', 'indicate'],
          dogru: 0,
          aciklama:
            'Makalenin katkısını tanıtan fiil "propose"dur: "we propose a new method". Outperform bir rakibi geride bırakmaktır ve nesnesi yöntem değil rakip olur; "indicate" ise sonuçların neye işaret ettiğini söylerken kullanılır.',
        },
        {
          tur: 'bosluk',
          id: 'yazilim-u11-d3-a3',
          soru: 'Our model ___ the baseline on all three datasets.',
          secenekler: ['outperforms', 'performs better', 'is superior'],
          dogru: 0,
          aciklama:
            'Boşluktan sonra doğrudan "the baseline" geliyor, yani nesneyi doğrudan alan bir fiil gerekir: outperforms. "Performs better" ve "is superior" ancak edatla tamamlanır: "performs better than", "is superior to".',
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u11-d3-a4',
          soru: 'Which sentence makes the most cautious claim?',
          secenekler: [
            'The results show that the method works on real hardware.',
            'The results prove that the method works on real hardware.',
            'The results suggest that the method works on real hardware.',
          ],
          dogru: 2,
          aciklama:
            '"Suggest" (düşündürüyor) en temkinli fiildir; kanıtın sınırlı olduğunu kabul eder. "Show" güçlü bir iddiadır, "prove" ise deneysel makalelerde neredeyse hiç kullanılmayacak kadar kesindir.',
        },
        {
          tur: 'dinle',
          id: 'yazilim-u11-d3-a5',
          cumle: 'We propose a lightweight method for detecting sensor faults.',
          anlam: 'Sensör arızalarını tespit etmek için hafif bir yöntem öneriyoruz.',
          celdiriciler: ['purpose', 'light', 'default'],
        },
        {
          tur: 'dinle',
          id: 'yazilim-u11-d3-a6',
          cumle: 'One limitation is that we tested only in simulation.',
          anlam: 'Bir sınırlılık, yalnızca simülasyonda test etmiş olmamız.',
          celdiriciler: ['limitations', 'test', 'emulation'],
        },
        {
          tur: 'konus',
          id: 'yazilim-u11-d3-a7',
          cumle: 'Our approach outperforms the baseline on all three datasets.',
          anlam: 'Yaklaşımımız üç veri kümesinin hepsinde temel yöntemi geride bırakıyor.',
          ipucu:
            'outperforms: "aut-pır-FORMZ", vurgu "form" hecesinde. datasets: "DEY-tı-sets" ya da "DE-tı-sets"; ikisi de doğru.',
        },
        {
          tur: 'yaz',
          id: 'yazilim-u11-d3-a8',
          kaynak: 'Bu makalede yeni bir yöntem öneriyoruz.',
          cevaplar: [
            'In this paper, we propose a new method.',
            'We propose a new method in this paper.',
            'In this paper, we propose a novel method.',
            'We propose a novel method in this paper.',
            'In this article, we propose a new method.',
            'We propose a new method in this article.',
          ],
        },
        {
          tur: 'yaz',
          id: 'yazilim-u11-d3-a9',
          kaynak: 'Bir sınırlılık, yalnızca simülasyonda test etmiş olmamız.',
          cevaplar: [
            'One limitation is that we tested only in simulation.',
            'One limitation is that we only tested in simulation.',
            'One limitation is that we tested in simulation only.',
            'One limitation is that we have tested only in simulation.',
            'One limitation is that we have only tested in simulation.',
            'A limitation is that we tested only in simulation.',
            'A limitation is that we only tested in simulation.',
            'A limitation is that we tested in simulation only.',
          ],
        },
        {
          tur: 'secmeli',
          id: 'yazilim-u11-d3-a10',
          metin: `Abstract — Detecting faulty sensors on high-speed vehicles is difficult because faults are rare and the signals are noisy. We propose LiteFD, a lightweight model that runs on a microcontroller. We evaluate it on two datasets collected on a test track. LiteFD detects 94% of injected faults, compared with 81% for a threshold-based baseline, while using 40 KB of RAM. However, all faults in our datasets were injected artificially; performance on naturally occurring faults remains to be evaluated.`,
          soru: 'Which statement does the abstract support?',
          secenekler: [
            "LiteFD's detection rate is thirteen percentage points higher than the baseline's.",
            'LiteFD has been shown to work on naturally occurring faults.',
            'LiteFD needs more memory than a microcontroller can provide.',
          ],
          dogru: 0,
          aciklama:
            'Tespit oranları %94 ve %81; fark 13 yüzde puandır. Doğal arızalardaki başarımın henüz değerlendirilmediğini özetin son cümlesi açıkça söylüyor. Model de 40 KB RAM ile mikrodenetleyicide çalışıyor, yani bellek yetiyor.',
        },
        {
          tur: 'konus',
          id: 'yazilim-u11-d3-a11',
          cumle: 'The results suggest that the method generalizes to other vehicles.',
          anlam: 'Sonuçlar, yöntemin başka araçlara da genellenebildiğini düşündürüyor.',
          ipucu:
            'generalizes: "CE-nı-rı-lay-zız", vurgu ilk hecede; sondaki "-zes" ayrı bir hece olarak "zız" okunur. vehicles: "Vİİ-ı-kılz"; "h" genellikle okunmaz.',
        },
      ],
    },
  ],
};

export const YAZILIM_EK: readonly Unite[] = [U8, U9, U10, U11];
