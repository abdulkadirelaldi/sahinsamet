import type { Parkur, Unite } from './tipler';

/**
 * SINAV İNGİLİZCESİ (2026-11-06) — YDS / e-YDS / YÖKDİL biçiminde, beş şıklı sorularla
 * dil bilgisi, akademik kelime ve soru tipi stratejisi. Sorular özgündür; ÖSYM sorusu
 * kopyalanmadı. Kimlikler KALICI: değiştirme, yalnızca sona ekle.
 */

const U1: Unite = {
  id: 'sinav-u1',
  gorsel: '⏳',
  seviye: 'B1',
  baslik: 'Zamanlar ve Zaman İfadeleri',
  ozet: 'Sınavın en sık sorduğu zaman uyumlarını — since/for, by the time, zaman sırası — cümledeki ipuçlarından tanımayı öğrenirsin.',
  dersler: [
    {
      id: 'sinav-u1-d1',
      gorsel: '🕰️',
      baslik: 'Present Perfect, Past Simple ve since/for',
      not: `**Present perfect** (have/has + V3) geçmişte başlayıp şimdiye uzanan ya da sonucu şimdi önemli olan eylemi anlatır. **Past simple** (V2) ise geçmişte bitmiş, zamanı belli eylemi anlatır.

Zaman ipuçları:
- since + başlangıç noktası (since 2010, since the war ended) → present perfect
- for + süre (for ten years) → present perfect ya da past simple
- ago, in 1998, last year, yesterday → past simple
- so far, up to now, recently, over the past decade → present perfect

Örnekler:
- Scientists **have studied** the virus since 2019. (Bilim insanları virüsü 2019'dan beri inceliyor.)
- The company **was founded** in 1998. (Şirket 1998'de kuruldu.)
- Over the past decade, prices **have risen** sharply. (Son on yılda fiyatlar keskin biçimde arttı.)
- Since the reform **was introduced**, unemployment **has fallen**. (Reform getirildiğinden beri işsizlik düştü.)

**Sınav taktiği:** Önce cümledeki zaman ifadesini bul. "since" ile başlayan yan cümlede genellikle past simple, ana cümlede present perfect olur. "over the last/past + süre" ya da "so far" gördüğünde doğrudan present perfect şıklarına bak.

**Sık yapılan hata:** "ago" ile present perfect kullanmak. "He has left two hours ago" yanlış; doğrusu "He left two hours ago".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u1-d1-a1',
          soru: 'Since the new policy ___ in 2015, the number of private universities in the country has nearly doubled.',
          secenekler: [
            'has been introduced',
            'was introduced',
            'had been introduced',
            'is introduced',
            'will be introduced',
          ],
          dogru: 1,
          aciklama:
            "'in 2015' geçmişte belirli bir zamandır; belirli geçmiş zamanla past simple kullanılır. Ana cümle 'has nearly doubled' present perfect olduğu için since yan cümlesi başlangıç noktasını past simple ile verir. 'has been introduced' güçlü çeldiricidir ama belirli bir yılla (in 2015) present perfect kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d1-a2',
          soru: 'So far, researchers ___ little evidence that the drug has serious side effects.',
          secenekler: ['found', 'had found', 'have found', 'were finding', 'would find'],
          dogru: 2,
          aciklama:
            "'So far' (şimdiye kadar) şimdiye uzanan bir dönemi anlatır ve present perfect ister. 'found' bitmiş bir geçmiş zamanı gösterir; 'so far' ile uyuşmaz. 'had found' ise geçmişteki başka bir olaydan öncesini anlatır, cümlede böyle bir olay yok.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d1-a3',
          soru: 'The ancient city ___ by an earthquake about 2,000 years ago, and its ruins were discovered only in the 19th century.',
          secenekler: [
            'was destroyed',
            'has been destroyed',
            'is being destroyed',
            'has destroyed',
            'will be destroyed',
          ],
          dogru: 0,
          aciklama:
            "'ago' ifadesi her zaman past simple ister; ayrıca şehir yıkımı yapan değil, yıkılan olduğu için edilgen gerekir: 'was destroyed'. 'has been destroyed' edilgendir ama 'ago' ile present perfect kullanılmaz. 'has destroyed' hem zaman hem çatı açısından yanlıştır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d1-a4',
          soru: 'Life expectancy in developing countries ___ steadily since the mid-twentieth century, largely thanks to vaccination programmes.',
          secenekler: ['rose', 'had risen', 'is rising', 'has risen', 'will rise'],
          dogru: 3,
          aciklama:
            "'since the mid-twentieth century' geçmişte başlayıp bugüne uzanan bir süreci anlatır; bu da present perfect ister. 'rose' süreci geçmişte bitmiş gibi gösterir, since ile ana cümlede kullanılmaz. 'is rising' şimdiki zamandır ve since ile uyumsuzdur.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d1-a5',
          soru: 'The two countries have not signed any trade agreement ___ the border dispute began.',
          secenekler: ['during', 'for', 'ago', 'until', 'since'],
          dogru: 4,
          aciklama:
            "Ana cümle present perfect (have not signed) ve boşluktan sonra bir başlangıç noktası bildiren tam cümle var (the border dispute began). Başlangıç noktası 'since' ile verilir. 'for' süre ister (for ten years), 'during' ve 'ago' tam cümle almaz.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u1-d1-a6',
          ciftler: [
            ['decade', 'on yıl'],
            ['steadily', 'istikrarlı biçimde'],
            ['considerable', 'kayda değer'],
            ['evidence', 'kanıt'],
            ['dispute', 'anlaşmazlık'],
            ['so far', 'şimdiye dek'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u1-d1-a7',
          cumle: 'The population of the city has doubled over the past two decades.',
          anlam: 'Şehrin nüfusu son yirmi yılda iki katına çıktı.',
          celdiriciler: ['since', 'doubles', 'had'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u1-d1-a8',
          kaynak: 'Bilim insanları bu hastalığı yıllardır inceliyor.',
          cevaplar: [
            'Scientists have been studying this disease for years.',
            'Scientists have studied this disease for years.',
            'Scientists have been studying this illness for years.',
            'Scientists have studied this illness for years.',
            'Scientists have been researching this disease for years.',
            'Scientists have researched this disease for years.',
            'Scientists have been investigating this disease for years.',
            'Scientists have been studying this disease for many years.',
            'Scientists have been studying this illness for many years.',
            'Scientists have studied this disease for many years.',
            'Scientists have studied this illness for many years.',
            'Scientists have been researching this disease for many years.',
            'Scientists have been researching this illness for years.',
            'Scientists have been researching this illness for many years.',
            'Scientists have researched this disease for many years.',
            'Scientists have researched this illness for years.',
            'Scientists have researched this illness for many years.',
            'Scientists have been investigating this disease for many years.',
            'Scientists have been investigating this illness for years.',
            'Scientists have been investigating this illness for many years.',
            'Scientists have investigated this disease for years.',
            'Scientists have investigated this disease for many years.',
            'Scientists have investigated this illness for years.',
            'Scientists have investigated this illness for many years.',
            'Scientists have been working on this disease for years.',
            'Scientists have been working on this disease for many years.',
            'Scientists have been working on this illness for years.',
            'Scientists have been working on this illness for many years.',
          ],
          aciklama:
            "'yıllardır' süre bildirir: for years. Geçmişte başlayıp hâlâ süren eylem için present perfect continuous (have been studying) ya da present perfect kullanılır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u1-d1-a9',
          soru: 'Since the financial crisis ended, the government has taken several measures to reduce unemployment.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Mali kriz sona erdiğinden beri hükümet, işsizliği azaltmak için çeşitli önlemler aldı.',
            'Mali kriz sona erdiği için hükümet, işsizliği azaltmak amacıyla çeşitli önlemler alacak.',
            'Hükümet, mali krizi sona erdirmek için işsizliği azaltacak çeşitli önlemler almıştı.',
            'Mali kriz sona ermeden önce hükümet, işsizliği azaltmaya yönelik birkaç önlem almıştı.',
            'Hükümetin işsizliği azaltmak için aldığı çeşitli önlemler, mali krizin sona ermesini sağladı.',
          ],
          dogru: 0,
          aciklama:
            "Ana cümle present perfect (has taken) olduğu için 'since' burada 'beri' anlamındadır ve doğru karşılık 'sona erdiğinden beri … önlemler aldı'dır. 'sona erdiği için … alacak' çevirisi 'since'i 'için' diye almış ve zamanı geleceğe kaydırmıştır. 'sona ermeden önce … almıştı' ve önlemlerin krizi bitirdiğini söyleyen çeviriler olayların sırasını ya da sebep-sonuç ilişkisini değiştirir.",
        },
        {
          tur: 'konus',
          id: 'sinav-u1-d1-a10',
          cumle: 'Over the past decade, the situation has changed considerably.',
          anlam: 'Son on yılda durum önemli ölçüde değişti.',
          ipucu:
            "'decade' DEK-eyd diye okunur, vurgu ilk hecede. 'considerably' kın-SİD-ır-ıb-li: vurgu ikinci hecede.",
        },
      ],
    },
    {
      id: 'sinav-u1-d2',
      gorsel: '⏪',
      baslik: "Past Perfect ve 'by the time'",
      not: `**Past perfect** (had + V3), geçmişteki iki olaydan **daha önce** olanı gösterir: "-mişti".

Zaman ipuçları:
- by the time + past simple → ana cümle past perfect
- before / when / until + past simple → ana cümlede önce olan eylem past perfect
- after + past perfect (önce olan eylem) → ana cümle past simple: After they had signed the deal, they left.
- before ve after sırayı zaten belirttiği için past perfect yerine past simple da kullanılabilir; sınav ise sırayı past perfect ile gösteren şıkkı ister.
- no sooner had … than / hardly had … when → "-ir -mez" (devrik yapı)
- past perfect continuous (had been + V-ing): önceki eylemin ne kadar sürdüğünü vurgular

Örnekler:
- By the time the ambulance arrived, the patient **had lost** consciousness. (Ambulans geldiğinde hasta bilincini kaybetmişti.)
- The team **had collected** all the data before they wrote the report. (Ekip, raporu yazmadan önce tüm verileri toplamıştı.)
- No sooner **had** the meeting **started** than the power went off. (Toplantı başlar başlamaz elektrikler kesildi.)
- She **had been working** there for ten years when the company closed. (Şirket kapandığında orada on yıldır çalışıyordu.)

**Sınav taktiği:** "By the time" sonrasındaki fiile bak: past simple ise ana cümlede past perfect, present simple ise future perfect (will have V3) ara. Cümle "No sooner / Hardly" ile başlıyorsa yalnızca "had + özne + V3" sırasıyla kurulan devrik şıkları değerlendir.

**Sık yapılan hata:** "No sooner had … when" demek. No sooner her zaman **than**, hardly ve scarcely ise **when** ile kullanılır.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u1-d2-a1',
          soru: 'By the time the firefighters arrived, the fire ___ most of the building.',
          secenekler: [
            'destroys',
            'has destroyed',
            'will have destroyed',
            'had destroyed',
            'was destroyed',
          ],
          dogru: 3,
          aciklama:
            "'By the time' + past simple (arrived) yapısında ana cümledeki eylem daha önce tamamlanmıştır: past perfect (had destroyed). 'was destroyed' edilgendir; oysa boşluktan sonra nesne (most of the building) var, yani etken fiil gerekir. 'will have destroyed' geleceğe ait olduğu için arrived ile uyuşmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d2-a2',
          soru: 'The researchers ___ the experiment several times before they finally obtained reliable results.',
          secenekler: [
            'repeat',
            'have repeated',
            'had repeated',
            'will have repeated',
            'are repeating',
          ],
          dogru: 2,
          aciklama:
            "'before they finally obtained' geçmişte bir olaydır; deneyin tekrarlanması bundan önce olduğu için past perfect (had repeated) gerekir. 'have repeated' şimdiye bağlanır, past simple ile kurulan zaman çizgisine uymaz. Diğer şıklar şimdiki ya da gelecek zamandır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d2-a3',
          soru: 'No sooner ___ the treaty than fighting broke out again along the border.',
          secenekler: [
            'the two countries had signed',
            'have the two countries signed',
            'the two countries signed',
            'did the two countries signed',
            'had the two countries signed',
          ],
          dogru: 4,
          aciklama:
            "'No sooner … than' kalıbı cümle başında devrik yapı ister: had + özne + V3. 'the two countries had signed' doğru zamanı içerir ama devrik değildir, bu yüzden yanlıştır. 'have … signed' zaman olarak 'broke out' ile uyuşmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d2-a4',
          soru: 'When the archaeologists opened the tomb, they realised that thieves ___ it centuries earlier.',
          secenekler: ['have robbed', 'had robbed', 'were robbing', 'would rob', 'rob'],
          dogru: 1,
          aciklama:
            "Mezarın soyulması, arkeologların onu açmasından (opened) ve durumu fark etmesinden (realised) yüzyıllar önce olmuştur; geçmişteki daha önceki olay past perfect ile anlatılır. 'have robbed' geçmiş anlatıda kullanılmaz. 'were robbing' o anda süren bir eylem anlamı verir, 'centuries earlier' ile çelişir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d2-a5',
          soru: 'She ___ in the laboratory for nearly ten hours when she finally discovered the error in her calculations.',
          secenekler: [
            'has been working',
            'is working',
            'had been working',
            'will have been working',
            'works',
          ],
          dogru: 2,
          aciklama:
            "'for nearly ten hours' süre bildirir ve bu süre geçmişteki bir ana (discovered) kadar devam etmiştir. Geçmişteki bir noktaya kadar süren eylem past perfect continuous ile anlatılır. 'has been working' aynı süreyi şimdiye bağlar, 'discovered' ile uyuşmaz.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u1-d2-a6',
          ciftler: [
            ['obtain', 'elde etmek'],
            ['reliable', 'güvenilir'],
            ['treaty', 'antlaşma'],
            ['break out', 'patlak vermek'],
            ['realise', 'farkına varmak'],
            ['destroy', 'yok etmek'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u1-d2-a7',
          cumle: 'By the time the results were published, the theory had already been rejected.',
          anlam: 'Sonuçlar yayımlandığında kuram çoktan reddedilmişti.',
          celdiriciler: ['has', 'was', 'publishing'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u1-d2-a8',
          kaynak: 'Toplantı başladığında o çoktan gitmişti.',
          cevaplar: [
            'When the meeting started, he had already left.',
            'When the meeting started, she had already left.',
            'When the meeting began, he had already left.',
            'When the meeting began, she had already left.',
            'When the meeting started, he had already gone.',
            'When the meeting started, she had already gone.',
            'When the meeting began, he had already gone.',
            'When the meeting began, she had already gone.',
            'By the time the meeting started, he had already left.',
            'By the time the meeting started, she had already left.',
            'He had already left when the meeting started.',
            'She had already left when the meeting started.',
            'He had already left by the time the meeting started.',
            'By the time the meeting started, he had already gone.',
            'He had already gone when the meeting started.',
            'He had already gone by the time the meeting started.',
            'By the time the meeting began, he had already left.',
            'He had already left when the meeting began.',
            'He had already left by the time the meeting began.',
            'By the time the meeting began, he had already gone.',
            'He had already gone when the meeting began.',
            'He had already gone by the time the meeting began.',
            'She had already left by the time the meeting started.',
            'By the time the meeting started, she had already gone.',
            'She had already gone when the meeting started.',
            'She had already gone by the time the meeting started.',
            'By the time the meeting began, she had already left.',
            'She had already left when the meeting began.',
            'She had already left by the time the meeting began.',
            'By the time the meeting began, she had already gone.',
            'She had already gone when the meeting began.',
            'She had already gone by the time the meeting began.',
          ],
          aciklama:
            "Gitme eylemi toplantının başlamasından önce olduğu için past perfect: 'had already left'. Türkçedeki 'o' cinsiyet belirtmez; he ya da she kabul edilir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u1-d2-a9',
          soru: 'Hükümet yeni yasayı çıkardığında, pek çok şirket yatırımlarını başka ülkelere çoktan taşımıştı.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Many companies moved their investments to other countries after the government passed the new law.',
            'By the time the government passed the new law, many companies had already moved their investments to other countries.',
            'Before many companies moved their investments abroad, the government had passed the new law.',
            'The government passed the new law because many companies had moved their investments to other countries.',
            'Many companies will have moved their investments to other countries by the time the government passes the new law.',
          ],
          dogru: 1,
          aciklama:
            "Türkçede yatırımların taşınması (taşımıştı) yasanın çıkarılmasından önce olmuştur; bu, 'By the time + past simple, … had already V3' yapısıyla verilir. 'after the government passed' ve 'Before many companies moved' ile kurulan seçenekler olayların sırasını tersine çevirir. 'because' ile kurulan seçenek olmayan bir sebep ilişkisi ekler, 'will have moved' ise zamanı geleceğe taşır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d2-a10',
          soru: 'Hardly ___ the lecture when the fire alarm went off.',
          secenekler: [
            'the professor had begun',
            'had the professor begun',
            'was the professor beginning',
            'the professor began',
            'has the professor begun',
          ],
          dogru: 1,
          aciklama:
            "'Hardly' cümle başında olumsuz anlamlı bir zarftır ve devrik yapı ister: had + özne + V3 … when. 'the professor had begun' doğru zamandadır ama devrik değildir. 'has the professor begun' devriktir ama present perfect, 'went off' ile uyuşmaz.",
        },
      ],
    },
    {
      id: 'sinav-u1-d3',
      gorsel: '🔮',
      baslik: 'Gelecek Zamanlar ve Zaman Uyumu',
      not: `Gelecekte belli bir noktaya kadar **tamamlanmış** olacak eylem için **future perfect** (will have + V3), o anda **sürüyor** olacak eylem için **future continuous** (will be + V-ing) kullanılır.

Kurallar:
- by + gelecek zaman (by 2050, by next year) → will have V3
- by the time / when / before / until / as soon as / once + **present** (simple ya da perfect) → ana cümlede will / will have
- this time tomorrow / at this time next year → will be V-ing
- Zaman uyumu (sequence of tenses): ana fiil geçmişte ise (said, stated, claimed) yan cümle bir zaman geriye kayar: will → would, is → was, has done → had done. (Aktarılan bilgi hâlâ geçerliyse kaydırma zorunlu değildir; ama 'the following year, the day before' gibi ifadeler kaydırmayı gerektirir.)

Örnekler:
- By 2050, the world population **will have reached** nearly ten billion. (2050'ye kadar dünya nüfusu neredeyse on milyara ulaşmış olacak.)
- By the time you **read** this report, we **will have completed** the survey. (Bu raporu okuduğunuzda anketi tamamlamış olacağız.)
- This time next year, I **will be studying** in Germany. (Gelecek yıl bu zamanlar Almanya'da okuyor olacağım.)
- The minister said that prices **would** fall. (Bakan fiyatların düşeceğini söyledi.)

**Sınav taktiği:** Zaman bağlacından (when, until, as soon as, by the time) sonraki boşlukta "will" içeren şıkları hemen ele; anlam gelecek olsa bile orada present tense kullanılır.

**Sık yapılan hata:** "When I will graduate, I will look for a job" demek. Doğrusu: "When I graduate, …"`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u1-d3-a1',
          soru: 'By the time the conference ends next Friday, the delegates ___ more than forty presentations.',
          secenekler: [
            'attended',
            'had attended',
            'have attended',
            'will have attended',
            'would have attended',
          ],
          dogru: 3,
          aciklama:
            "'By the time' + present simple (ends) ve 'next Friday' gelecekteki bir noktayı gösterir; o noktaya kadar tamamlanmış olacak eylem future perfect (will have attended) ile anlatılır. 'had attended' aynı yapının geçmişteki karşılığıdır ve 'ends next Friday' ile uyuşmaz. 'would have attended' gerçek dışı geçmiş anlatır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d3-a2',
          soru: 'Experts predict that by 2040 electric vehicles ___ petrol cars in most European markets.',
          secenekler: [
            'replaced',
            'will have replaced',
            'had replaced',
            'have been replacing',
            'were replacing',
          ],
          dogru: 1,
          aciklama:
            "'by 2040' gelecekteki bir son tarihtir ve 'predict' bir tahmin bildirir; o tarihe kadar tamamlanmış olacak eylem future perfect ister. 'had replaced' ve 'were replacing' geçmiş zamandır. 'have been replacing' şimdiye kadar süren bir eylemi anlatır, gelecekteki tarihle uyuşmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d3-a3',
          soru: 'The new hospital will not open until the construction ___ fully completed.',
          secenekler: ['will be', 'would be', 'has been', 'had been', 'will have been'],
          dogru: 2,
          aciklama:
            "'until' bir zaman bağlacıdır; ana cümle gelecek zamanda olsa bile bağlaçtan sonra will kullanılmaz. Tamamlanma vurgusu için present perfect (has been completed) uygundur. 'will be' ve 'will have been' bu kural yüzünden elenir; 'had been' geçmişe aittir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d3-a4',
          soru: 'This time next month, the research team ___ samples in the Antarctic.',
          secenekler: [
            'will be collecting',
            'collects',
            'has collected',
            'had been collecting',
            'collected',
          ],
          dogru: 0,
          aciklama:
            "'This time next month' gelecekte belli bir anda sürmekte olacak bir eylemi anlatır; bu future continuous (will be collecting) ile verilir. 'collects' geniş zamandır ve gelecekteki tek bir anı göstermez. 'has collected' ve 'collected' tamamlanmış eylem anlatır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u1-d3-a5',
          soru: 'The minister stated that the government ___ taxes the following year.',
          secenekler: ['will reduce', 'reduces', 'is reducing', 'has reduced', 'would reduce'],
          dogru: 4,
          aciklama:
            "Ana fiil geçmiş zamanda (stated) ve 'the following year' aktarılan bir ifadedir; zaman uyumu gereği will → would olur. 'will reduce' güçlü çeldiricidir ama 'the following year' (ertesi yıl) ifadesi geçmişteki bir bakış açısını gösterdiği için geri kaydırma gerekir.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u1-d3-a6',
          ciftler: [
            ['predict', 'tahmin etmek'],
            ['replace', 'yerini almak'],
            ['delegate', 'delege'],
            ['survey', 'anket'],
            ['construction', 'inşaat'],
            ['sample', 'numune'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u1-d3-a7',
          cumle: 'By the end of this decade, scientists will have mapped the entire ocean floor.',
          anlam:
            'Bu on yılın sonuna kadar bilim insanları okyanus tabanının tamamının haritasını çıkarmış olacak.',
          celdiriciler: ['had', 'mapping', 'until'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u1-d3-a8',
          kaynak: 'Sonuçlar hazır olur olmaz size haber vereceğiz.',
          cevaplar: [
            'We will inform you as soon as the results are ready.',
            'We will let you know as soon as the results are ready.',
            'We will tell you as soon as the results are ready.',
            'We will notify you as soon as the results are ready.',
            'As soon as the results are ready, we will inform you.',
            'As soon as the results are ready, we will let you know.',
            'As soon as the results are ready, we will tell you.',
            'As soon as the results are ready, we will notify you.',
            'We will contact you as soon as the results are ready.',
            'As soon as the results are ready, we will contact you.',
          ],
          aciklama:
            "'as soon as' bir zaman bağlacıdır; ardından gelecek anlamı olsa da present simple gelir: 'are ready' (will be ready değil).",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u1-d3-a9',
          soru: 'The project will not be completed until the necessary funds are provided.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The project will be completed only after the necessary funds are provided.',
            'The necessary funds will be provided as soon as the project is completed.',
            'Even if the necessary funds are provided, the project will not be completed.',
            'The necessary funds were provided, but the project has not been completed yet.',
            'Unless the project is completed, the necessary funds will not be provided.',
          ],
          dogru: 0,
          aciklama:
            "'not … until' yapısı 'ancak … -dikten sonra' anlamı verir: proje ancak fonlar sağlandıktan sonra tamamlanacak. 'as soon as the project is completed' ve 'Unless the project is completed' seçenekleri koşulu tersine çevirir (fonu projeye bağlar). 'Even if' ile kurulan seçenek fon sağlansa bile tamamlanmayacağını söyler, 'were provided' ise geçmiş bir durum anlatır.",
        },
        {
          tur: 'konus',
          id: 'sinav-u1-d3-a10',
          cumle: 'Global temperatures will have risen considerably by the end of the century.',
          anlam: 'Yüzyılın sonuna kadar küresel sıcaklıklar önemli ölçüde artmış olacak.',
          ipucu:
            "'century' SEN-çı-ri diye okunur. 'temperatures' TEM-prı-çırz: ortadaki 'e' çoğu zaman yutulur.",
        },
      ],
    },
  ],
};

const U2: Unite = {
  id: 'sinav-u2',
  gorsel: '⚖️',
  seviye: 'B1',
  baslik: 'Kipler (Modals)',
  ozet: "must, may, should ve perfect modal yapılarının (must have, can't have, needn't have) anlam farklarını sınav cümlelerinde ayırt edersin.",
  dersler: [
    {
      id: 'sinav-u2-d1',
      gorsel: '🚦',
      baslik: 'Zorunluluk, Olasılık ve Tavsiye',
      not: `Kipler (modals) fiile zorunluluk, olasılık, yetenek ya da tavsiye anlamı katar; ardından fiilin yalın hâli gelir.

- **must:** güçlü zorunluluk ya da kesine yakın çıkarım ("-meli, -malı")
- **have to:** dışarıdan gelen zorunluluk (kural, koşullar)
- **don't have to / needn't:** gerek yok, isteğe bağlı
- **mustn't:** yasak
- **should / ought to:** tavsiye
- **may / might / could:** olasılık ("-ebilir")
- **can / be able to:** yetenek; geçmişteki genel yetenek için could

Örnekler:
- Students **must** submit their theses by June. (Öğrenciler tezlerini haziran ayına kadar teslim etmek zorunda.)
- You **don't have to** attend the seminar; it is optional. (Seminere katılmak zorunda değilsin; isteğe bağlı.)
- Visitors **mustn't** touch the exhibits. (Ziyaretçilerin eserlere dokunması yasaktır.)
- The new drug **may** cause side effects in some patients. (Yeni ilaç bazı hastalarda yan etkilere yol açabilir.)

**Sınav taktiği:** Kip sorusunda cevap cümlenin geri kalanındadır. "optional, voluntary" → don't have to / needn't; "strictly prohibited, illegal" → mustn't; "it is not certain, perhaps" → may / might. Önce bu ipucunu bul, sonra şıklara bak.

**Sık yapılan hata:** mustn't ile don't have to'yu aynı sanmak. "You mustn't come" yasaklar, "You don't have to come" yalnızca gerek olmadığını söyler.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u2-d1-a1',
          soru: 'Participation in the survey is entirely voluntary, so employees ___ answer the questions if they do not wish to.',
          secenekler: ["mustn't", "don't have to", "can't", "shouldn't", 'had better not'],
          dogru: 1,
          aciklama:
            "'entirely voluntary' (tamamen gönüllü) ve 'if they do not wish to' ipuçları zorunluluk olmadığını gösterir: don't have to. 'mustn't' yasak bildirir; gönüllü bir ankette cevap vermek yasak değildir. 'shouldn't' ve 'had better not' cevap vermemeyi tavsiye eder, bu da anlamı bozar.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d1-a2',
          soru: 'Although the results look promising, the researchers warn that the treatment ___ not be effective for all patients.',
          secenekler: ['must', 'has to', 'might', 'should', 'would rather'],
          dogru: 2,
          aciklama:
            "'Although the results look promising' ve 'warn' bir belirsizlik ve ihtimal bildirir: tedavi herkes için etkili olmayabilir (might not). 'must not' yasak ya da kesin çıkarım anlamı verir, uyarının temkinli tonuna uymaz. 'has to' boşluktaki 'not' ile kurulamaz; olumsuzu 'does not have to' olur ve 'gerek yok' anlamı verir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d1-a3',
          soru: 'Passengers ___ use mobile phones during take-off, as this is strictly prohibited by aviation rules.',
          secenekler: ["mustn't", "needn't", "don't have to", 'may', 'are able to'],
          dogru: 0,
          aciklama:
            "'strictly prohibited' (kesinlikle yasak) ifadesi yasak bildiren mustn't'u gerektirir. 'needn't' ve 'don't have to' yalnızca gereksizlik anlatır; yasak anlamı vermez. 'may' izin verir, bu da cümlenin geri kalanıyla çelişir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d1-a4',
          soru: 'Before the invention of the printing press, only a small number of people ___ read and write.',
          secenekler: ['must', 'should', 'may', 'had better', 'could'],
          dogru: 4,
          aciklama:
            "Cümle geçmişteki genel bir yeteneği anlatır (matbaanın icadından önce okuma yazma bilenler); geçmişte genel yetenek 'could' ile verilir. 'must', 'should' ve 'had better' zorunluluk ya da tavsiye bildirir. 'may' şimdiki ya da gelecekteki olasılık içindir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d1-a5',
          soru: 'Since the bridge is closed for repairs, drivers ___ use an alternative route until further notice.',
          secenekler: ["needn't", 'might have', 'would rather', 'will have to', "couldn't"],
          dogru: 3,
          aciklama:
            "Köprünün kapalı olması dışarıdan gelen bir zorunluluk yaratır ve 'until further notice' (yeni bir duyuruya kadar) geleceği kapsar: will have to. 'needn't' zorunluluğu kaldırır, anlam tersine döner. 'might have' ardından V3 ister, burada yalın fiil var.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u2-d1-a6',
          ciftler: [
            ['voluntary', 'gönüllü'],
            ['prohibit', 'yasaklamak'],
            ['alternative', 'seçenek'],
            ['promising', 'umut verici'],
            ['side effect', 'yan etki'],
            ['submit', 'teslim etmek'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u2-d1-a7',
          cumle: 'Governments should invest more in renewable energy sources.',
          anlam: 'Hükümetler yenilenebilir enerji kaynaklarına daha fazla yatırım yapmalı.',
          celdiriciler: ['must', 'investing', 'would'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u2-d1-a8',
          kaynak: 'Bu formu doldurmak zorunda değilsiniz.',
          cevaplar: [
            "You don't have to fill in this form.",
            "You don't have to fill out this form.",
            "You don't need to fill in this form.",
            "You don't need to fill out this form.",
            "You needn't fill in this form.",
            "You needn't fill out this form.",
            "You don't have to complete this form.",
            "You don't have to fill this form in.",
            "You don't have to fill this form out.",
            "You don't need to complete this form.",
            "You don't need to fill this form in.",
            "You don't need to fill this form out.",
            "You needn't complete this form.",
            "You needn't fill this form in.",
            "You needn't fill this form out.",
            'You do not have to fill in this form.',
            'You do not have to fill out this form.',
            'You do not have to complete this form.',
            'You do not have to fill this form in.',
            'You do not have to fill this form out.',
            'You do not need to fill in this form.',
            'You do not need to fill out this form.',
            'You do not need to complete this form.',
            'You do not need to fill this form in.',
            'You do not need to fill this form out.',
          ],
          aciklama:
            "'zorunda değilsiniz' gereksizlik bildirir: don't have to / don't need to / needn't. 'mustn't' yasak anlamı verirdi.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u2-d1-a9',
          metin:
            "Student: I've finished the assignment, but I'm not sure whether to print it.\nProfessor: ___\nStudent: Great, that will save me some paper.",
          soru: 'Diyaloğu tamamlayan ifade hangisidir?',
          secenekler: [
            'You must hand in a printed copy by Monday.',
            "You don't have to print it; you can simply email it to me.",
            'You should have printed it last week.',
            "You couldn't have finished it so quickly.",
            'You might need to print several copies.',
          ],
          dogru: 1,
          aciklama:
            "Öğrencinin son cümlesi 'that will save me some paper' (kâğıttan tasarruf edeceğim) olduğuna göre profesör yazdırmaya gerek olmadığını söylemiştir: don't have to print it. 'You must hand in a printed copy' ve 'You might need to print several copies' yazdırmayı gerektirir, bu da kâğıt tasarrufuyla çelişir. 'You couldn't have finished it' ise öğrencinin ödevi bitirdiğini reddeder.",
        },
        {
          tur: 'konus',
          id: 'sinav-u2-d1-a10',
          cumle: 'Researchers must ensure that their data are reliable.',
          anlam: 'Araştırmacılar verilerinin güvenilir olduğundan emin olmalı.',
          ipucu:
            "'ensure' in-ŞUR diye okunur, vurgu ikinci hecede. 'reliable' ri-LAY-ı-bıl: vurgu ikinci hecede.",
        },
      ],
    },
    {
      id: 'sinav-u2-d2',
      gorsel: '🔍',
      baslik: "Perfect Modals: must have, can't have, should have, needn't have",
      not: `Perfect modal (modal + have + V3) **geçmişe** dair çıkarım, eleştiri ya da gerçekleşmemiş olasılık anlatır.

- **must have V3:** güçlü çıkarım ("-mış olmalı")
- **can't / couldn't have V3:** imkânsızlık ("-mış olamaz")
- **may / might / could have V3:** olasılık ("-mış olabilir")
- **should have V3:** yapılması gerekirdi ama yapılmadı ("-malıydı")
- **could have V3:** yapılabilirdi ama yapılmadı ("-ebilirdi")
- **needn't have V3:** yapıldı ama gereksizdi ("-mesine gerek yokmuş")

Örnekler:
- The ground is wet; it **must have rained**. (Yer ıslak; yağmur yağmış olmalı.)
- He **can't have written** this report; he was abroad. (Bu raporu o yazmış olamaz; yurt dışındaydı.)
- The engineers **should have tested** the system. (Mühendisler sistemi test etmeliydi.)
- We **needn't have booked** a table; the restaurant was empty. (Masa ayırtmamıza gerek yokmuş; restoran boştu.)

**Sınav taktiği:** Boşluktan sonra gelen gerekçeye bak. Gerekçe bir kanıtsa (the ground is wet) must have; gerekçe bir engelse (he was abroad, it was dark) can't have; "but they didn't" ya da "the disaster revealed flaws" gibi bir eleştiri varsa should have seç.

**Sık yapılan hata:** needn't have ile didn't need to'yu karıştırmak. "I needn't have bought it" alındığını, "I didn't need to buy it" ise genellikle alınmadığını anlatır.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u2-d2-a1',
          soru: 'The streets are completely wet this morning, so it ___ heavily during the night.',
          secenekler: [
            'should have rained',
            'must have rained',
            "needn't have rained",
            "can't have rained",
            'would rather rain',
          ],
          dogru: 1,
          aciklama:
            "Sokakların ıslak olması geçmişe dair güçlü bir kanıttır; kanıttan çıkarım 'must have V3' ile yapılır. 'can't have rained' kanıtla çelişir. 'should have rained' bir eleştiri ya da beklenti anlatır, çıkarım değil.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d2-a2',
          soru: 'The ancient manuscript ___ by Aristotle himself, because it refers to events that took place two centuries after his death.',
          secenekler: [
            'must have been written',
            'should have been written',
            "can't have been written",
            'may have written',
            "needn't have been written",
          ],
          dogru: 2,
          aciklama:
            "El yazması Aristoteles'in ölümünden iki yüzyıl sonraki olaylardan söz ediyorsa onun tarafından yazılmış olması imkânsızdır: can't have been written. 'must have been written' kanıtın tam tersini söyler. 'may have written' etken çatıdadır; el yazması yazan değil yazılandır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d2-a3',
          soru: 'We ___ so much food for the party; in the end, only half of the guests turned up.',
          secenekler: [
            "needn't have prepared",
            "mustn't prepare",
            "can't have prepared",
            'had to prepare',
            'must have prepared',
          ],
          dogru: 0,
          aciklama:
            "Yemek hazırlandı ama misafirlerin yarısı geldiği için gereksiz oldu; 'yapıldı ama gereksizdi' anlamı needn't have V3 ile verilir. 'must have prepared' bir çıkarım anlatır, oysa konuşan kişi ne yaptığını biliyor. 'had to prepare' zorunluluk bildirir ve 'in the end' ile kurulan pişmanlık anlamını karşılamaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d2-a4',
          soru: 'The engineers ___ the safety of the dam more carefully; the disaster revealed serious design flaws.',
          secenekler: [
            'must have checked',
            "needn't have checked",
            'may check',
            'should have checked',
            "can't have checked",
          ],
          dogru: 3,
          aciklama:
            "Felaketin ciddi tasarım kusurlarını ortaya çıkarması, mühendislerin yeterince dikkatli davranmadığını gösterir; geçmişe yönelik eleştiri should have V3 ile yapılır. 'must have checked more carefully' kusurların ortaya çıkmasıyla çelişir. 'may check' şimdiki/gelecek olasılıktır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d2-a5',
          soru: 'With a little more funding, the team ___ the project on time, but the budget was cut in the middle of the year.',
          secenekler: [
            'must have finished',
            "needn't have finished",
            "can't have finished",
            'had to finish',
            'could have finished',
          ],
          dogru: 4,
          aciklama:
            "'With a little more funding' gerçekleşmemiş bir koşul, 'but the budget was cut' ise bunun neden olmadığını gösterir: yapılabilirdi ama yapılmadı → could have V3. 'must have finished' projenin bittiğini çıkarır, bütçe kesintisiyle çelişir. 'had to finish' zorunluluk anlatır.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u2-d2-a6',
          ciftler: [
            ['manuscript', 'el yazması'],
            ['flaw', 'kusur'],
            ['reveal', 'ortaya çıkarmak'],
            ['funding', 'finansman'],
            ['turn up', 'gelmek, çıkagelmek'],
            ['refer to', 'söz etmek'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u2-d2-a7',
          cumle: 'The ancient settlement must have been abandoned after a severe drought.',
          anlam: 'Antik yerleşim yeri şiddetli bir kuraklıktan sonra terk edilmiş olmalı.',
          celdiriciler: ['should', 'abandon', 'before'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u2-d2-a8',
          kaynak: 'Daha dikkatli olmalıydın.',
          cevaplar: [
            'You should have been more careful.',
            'You ought to have been more careful.',
            "You should've been more careful.",
          ],
          aciklama:
            "'-malıydın' geçmişte yapılması gereken ama yapılmayan bir şeyi anlatır: should have + V3 (been).",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u2-d2-a9',
          soru: 'It was unnecessary for the committee to postpone the meeting, but they did so anyway.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The committee must have postponed the meeting.',
            'The committee should have postponed the meeting.',
            "The committee needn't have postponed the meeting.",
            "The committee didn't need to postpone the meeting, so they held it as planned.",
            "The committee can't have postponed the meeting.",
          ],
          dogru: 2,
          aciklama:
            "Asıl cümle toplantının ertelendiğini ama bunun gereksiz olduğunu söylüyor; bu tam olarak needn't have V3 anlamıdır. 'didn't need to postpone …, so they held it as planned' gereksizliği doğru verir ama toplantının planlandığı gibi yapıldığını, yani ertelenmediğini söyler. 'should have postponed' ertelenmesi gerektiğini, 'can't have' ertelenmediğini anlatır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d2-a10',
          soru: 'The witness ___ the suspect clearly, as the street was completely dark at the time.',
          secenekler: [
            'must have seen',
            'should have seen',
            "needn't have seen",
            "couldn't have seen",
            'had to see',
          ],
          dogru: 3,
          aciklama:
            "'the street was completely dark' görmeyi engelleyen bir gerekçedir; geçmişe dair imkânsızlık couldn't have V3 ile anlatılır. 'must have seen' engelle çelişir. 'should have seen' tanığı görmediği için eleştirir; karanlık bir sokakta bu mantıksızdır.",
        },
      ],
    },
    {
      id: 'sinav-u2-d3',
      gorsel: '💬',
      baslik: 'Modal Benzeri Yapılar ve Diyalog Tamamlama',
      not: `Bazı kalıplar kip gibi davranır ve sınavda sık sorulur:

- **had better + V1:** yapsan iyi olur (uyarı) — olumsuzu: had better not
- **would rather + V1 (than V1):** tercih ederim; başka biri için: would rather + özne + V2
- **be supposed to + V1:** beklenti ya da kural ("-mesi gerekiyor / bekleniyor")
- **used to + V1:** geçmişte olan ama artık olmayan alışkanlık ya da durum
- **be / get used to + V-ing / isim:** alışkın olmak / alışmak

Örnekler:
- You **had better** leave now, or you will miss the bus. (Şimdi çıksan iyi olur, yoksa otobüsü kaçıracaksın.)
- I **would rather** work alone **than** in a group. (Grupla çalışmaktansa yalnız çalışmayı tercih ederim.)
- The report **is supposed to** be ready by Monday. (Raporun pazartesiye kadar hazır olması gerekiyor.)
- She **is used to working** under pressure. (Baskı altında çalışmaya alışkın.)

**Sınav taktiği (diyalog tamamlama):** Boşluğun hemen ardından gelen konuşmayı oku. Karşı taraf "Then I'll ask someone else" diyorsa boşlukta bir ret ya da engel olmalı; "That's a relief" diyorsa olumlu bir haber. Boşluktan önceki cümleye değil, özellikle sonraki tepkiye uyan şıkkı seç.

**Sık yapılan hata:** "I would rather to stay" ya da "I'm used to work" demek. Doğruları: "I would rather stay", "I'm used to working".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u2-d3-a1',
          soru: 'The road conditions are terrible tonight; you ___ leave early if you want to arrive on time.',
          secenekler: ['would rather', 'had better', 'are used to', 'used to', 'are supposed'],
          dogru: 1,
          aciklama:
            "Kötü yol koşulları ve 'if you want to arrive on time' bir uyarı ya da güçlü tavsiye gerektirir: had better. 'would rather' kişinin kendi tercihini anlatır, başkasına uyarı vermez. 'are used to' ardından V-ing ister, 'are supposed' ise 'to' olmadan eksiktir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d3-a2',
          soru: 'Most participants said they ___ work from home than commute to the office every day.',
          secenekler: ['had better', 'prefer', 'are supposed to', 'would rather', 'used to'],
          dogru: 3,
          aciklama:
            "Cümledeki 'than' ve iki yalın fiil (work … than commute) 'would rather + V1 + than + V1' kalıbını gösterir. 'prefer' anlam olarak yakındır ama 'prefer working … to commuting' ya da 'prefer to work … rather than' gibi farklı bir yapı ister. 'had better' tercih değil uyarı bildirir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d3-a3',
          soru: 'In many traditional societies, children ___ look after their parents in old age; this is regarded as a moral duty.',
          secenekler: ['are supposed to', 'had better', 'would rather', 'are used to', "needn't"],
          dogru: 0,
          aciklama:
            "'this is regarded as a moral duty' toplumsal bir beklenti ve kural olduğunu gösterir: be supposed to. 'are used to' ardından V-ing (looking after) isterdi. 'needn't' zorunluluğu kaldırır ve 'moral duty' ile çelişir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d3-a4',
          soru: 'People in rural areas ___ grow most of their own food before supermarkets became widespread.',
          secenekler: ['are used to', 'would rather', 'used to', 'get used to', 'had better'],
          dogru: 2,
          aciklama:
            "'before supermarkets became widespread' geçmişte olan ama artık olmayan bir alışkanlığı anlatır: used to + V1. 'are used to' ve 'get used to' alışkın olmayı anlatır ve ardından V-ing ister. 'would rather' tercih bildirir, geçmiş alışkanlık değil.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u2-d3-a5',
          soru: 'After living in Norway for several years, the researcher finally ___ the long, dark winters.',
          secenekler: ['used to', 'would rather', 'was supposed to', 'had better', 'got used to'],
          dogru: 4,
          aciklama:
            "'After living … for several years' ve 'finally' zamanla alışmayı anlatır; boşluktan sonra bir isim öbeği (the long, dark winters) gelir: got used to + isim. 'used to' ardından fiil ister ve geçmiş alışkanlık anlamı verir. 'was supposed to' ve 'had better' de ardından fiil ister.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u2-d3-a6',
          ciftler: [
            ['commute', 'işe gidip gelmek'],
            ['rural', 'kırsal'],
            ['widespread', 'yaygın'],
            ['duty', 'görev'],
            ['regard as', 'olarak görmek'],
            ['participant', 'katılımcı'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u2-d3-a7',
          cumle: 'Most participants would rather work from home than commute every day.',
          anlam: 'Katılımcıların çoğu her gün işe gidip gelmektense evden çalışmayı tercih ediyor.',
          celdiriciler: ['better', 'to', 'prefer'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u2-d3-a8',
          kaynak: 'Toplantıya geç kalmasan iyi olur.',
          cevaplar: [
            'You had better not be late for the meeting.',
            "You'd better not be late for the meeting.",
            'You had better not be late to the meeting.',
            "You'd better not be late to the meeting.",
          ],
          aciklama:
            "'-masan iyi olur' bir uyarıdır: had better not + V1. 'not' had better'dan sonra gelir ('had not better' yanlıştır).",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u2-d3-a9',
          metin:
            "Ayşe: Can I borrow your laptop for my presentation this afternoon?\nMark: ___\nAyşe: No problem, I'll ask Selin then.",
          soru: 'Diyaloğu tamamlayan ifade hangisidir?',
          secenekler: [
            "Sure, I'd be glad to help. Here it is.",
            "I'd rather not; I need it for my own lecture at two.",
            'You had better buy a new one before the presentation.',
            "Of course, but you're supposed to return it by tomorrow.",
            "I'm used to giving presentations without slides.",
          ],
          dogru: 1,
          aciklama:
            "Ayşe'nin 'No problem, I'll ask Selin then' cevabı Mark'ın bilgisayarı vermediğini gösterir; kibar bir ret 'I'd rather not' ile yapılır ve gerekçe de verilmiştir. 'Sure, I'd be glad to help' ve 'Of course, but you're supposed to return it' cevaplarında Mark bilgisayarı verir, bu yüzden Selin'e sormaya gerek kalmaz. Yeni bilgisayar almayı öneren ve slaytsız sunumdan söz eden cevaplar isteğe doğrudan yanıt vermez.",
        },
        {
          tur: 'konus',
          id: 'sinav-u2-d3-a10',
          cumle: 'We would rather invest in research than reduce the budget.',
          anlam: 'Bütçeyi kısmaktansa araştırmaya yatırım yapmayı tercih ederiz.',
          ipucu:
            "'rather' RAA-dhır: 'th' sesi için dil ucu dişlerin arasına gelir. 'research' ri-SÖÖRÇ: İngiliz İngilizcesinde vurgu genellikle ikinci hecede (Rİİ-söörç da duyulur).",
        },
      ],
    },
  ],
};

const U3: Unite = {
  id: 'sinav-u3',
  gorsel: '🔄',
  seviye: 'B2',
  baslik: 'Edilgen Yapı, Ettirgen ve Koşul Cümleleri',
  ozet: 'Akademik metinlerin bel kemiği olan edilgen yapıyı, ettirgen kalıpları ve koşul/wish cümlelerini sınav hızında çözersin.',
  dersler: [
    {
      id: 'sinav-u3-d1',
      gorsel: '🏗️',
      baslik: 'Edilgen Yapı (Passive Voice)',
      not: `Edilgen yapıda (passive) eylemi yapan değil, eylemden **etkilenen** özne olur: **be + V3**. Akademik İngilizcede çok yaygındır.

- Simple: is/was done
- Continuous: is/was **being** done
- Perfect: has/had **been** done
- Modal: must/can/should **be** done; geçmiş: must **have been** done
- Aktarma edilgeni: It is believed/said/thought that … = X is believed **to** V1 (aynı zaman) / **to have** V3 (daha önce)

Örnekler:
- The vaccine **is being tested** on volunteers. (Aşı gönüllüler üzerinde test ediliyor.)
- The results **have been published** in a leading journal. (Sonuçlar önde gelen bir dergide yayımlandı.)
- The temple **is thought to have been built** in the 5th century. (Tapınağın 5. yüzyılda inşa edildiği düşünülüyor.)
- All forms **must be signed** by the applicant. (Tüm formlar başvuru sahibi tarafından imzalanmalıdır.)

**Sınav taktiği:** Boşluktan sonra nesne yoksa ve özne eylemi yapamayacak bir şeyse (rainforest, data, the bridge) etken şıkları ele. Kalan edilgen şıklar arasından doğru zamanı cümledeki ipucuyla (over the last decade, at the moment, before) seç.

**Sık yapılan hata:** Geçmişe ait bir inanışta "is believed to build" demek. Eylem daha önce olduysa "is believed **to have been** built" gerekir.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u3-d1-a1',
          soru: 'Over the last decade, thousands of hectares of rainforest ___ to create farmland.',
          secenekler: [
            'cleared',
            'have cleared',
            'have been cleared',
            'are clearing',
            'had cleared',
          ],
          dogru: 2,
          aciklama:
            "Yağmur ormanı kendisi bir şeyi temizlemez, temizlenir; boşluktan sonra nesne de yok, yani edilgen gerekir. 'Over the last decade' present perfect ister: have been cleared. 'have cleared' zamanı doğru ama etken olduğu için yanlıştır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d1-a2',
          soru: 'The new vaccine ___ on several thousand volunteers at the moment, and the first results are expected next year.',
          secenekler: [
            'is being tested',
            'has tested',
            'was tested',
            'is testing',
            'had been tested',
          ],
          dogru: 0,
          aciklama:
            "'at the moment' şu anda süren bir eylemi, aşının test eden değil test edilen olması da edilgeni gösterir: is being tested (present continuous passive). 'is testing' zamanı doğru ama etkendir; aşı bir şeyi test etmez. 'was tested' geçmişte bitmiş bir eylem anlatır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d1-a3',
          soru: 'The earliest form of writing ___ to have been developed in Mesopotamia around 3200 BC.',
          secenekler: ['believes', 'is believed', 'has believed', 'believed', 'was believing'],
          dogru: 1,
          aciklama:
            "Yazı bir şeye inanmaz; ona dair genel bir kanı aktarılıyor: X is believed to have been V3 (… geliştirildiğine inanılıyor). 'to have been developed' geliştirmenin inanıştan çok önce olduğunu gösterir. 'believes' ve 'has believed' etken çatıdır, 'believed' ise burada edilgen için 'is' olmadan eksiktir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d1-a4',
          soru: 'Before the bridge was opened to traffic, it ___ by independent engineers for structural weaknesses.',
          secenekler: [
            'has inspected',
            'had inspected',
            'was inspecting',
            'has been inspected',
            'had been inspected',
          ],
          dogru: 4,
          aciklama:
            "'by independent engineers' edilgen yapının ipucudur ve denetim köprünün açılmasından (was opened) önce yapılmıştır: past perfect passive (had been inspected). 'had inspected' zamanı doğru ama etkendir. 'has been inspected' geçmişteki bir olaydan öncesini anlatamaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d1-a5',
          soru: 'All applications ___ before the deadline; late submissions will not be considered.',
          secenekler: [
            'must submit',
            'must have submitted',
            'should submit',
            'must be submitted',
            'have to submit',
          ],
          dogru: 3,
          aciklama:
            "Başvurular teslim eden değil teslim edilen şeylerdir ve boşluktan sonra nesne yoktur: modal + be + V3 (must be submitted). 'must submit', 'should submit' ve 'have to submit' etken çatıdır. 'must have submitted' geçmişe dair bir çıkarım anlatır.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u3-d1-a6',
          ciftler: [
            ['implement', 'uygulamak'],
            ['volunteer', 'gönüllü'],
            ['regulation', 'yönetmelik'],
            ['inspect', 'denetlemek'],
            ['deadline', 'son tarih'],
            ['journal', 'bilimsel dergi'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u3-d1-a7',
          cumle: 'The findings of the study were published in a leading medical journal.',
          anlam: 'Çalışmanın bulguları önde gelen bir tıp dergisinde yayımlandı.',
          celdiriciler: ['publishing', 'has', 'by'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u3-d1-a8',
          kaynak: 'Sonuçlar gelecek ay açıklanacak.',
          cevaplar: [
            'The results will be announced next month.',
            'The results are going to be announced next month.',
            'The results will be published next month.',
            'The results will be released next month.',
            'The results will be declared next month.',
            'The results are going to be published next month.',
            'The results are going to be released next month.',
          ],
          aciklama:
            'Sonuçlar açıklayan değil açıklanan şeydir: will be + V3 (announced / published / released).',
        },
        {
          tur: 'secmeli',
          id: 'sinav-u3-d1-a9',
          soru: 'It is widely believed that the climate of the region was much warmer in ancient times.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Antik çağlarda bölgenin iklimi çok sıcak olduğu için insanlar buna yaygın olarak inanıyordu.',
            'Bölgenin iklimi antik çağlardan beri giderek ısınmaktadır ve bu yaygın bir inançtır.',
            'Antik çağlarda pek çok kişi bölgenin ikliminin daha sıcak olacağına inanıyordu.',
            'Bölgenin ikliminin antik çağlarda çok daha sıcak olduğuna yaygın olarak inanılmaktadır.',
            'Bölgenin ikliminin antik çağlarda daha sıcak olup olmadığı yaygın biçimde tartışılmaktadır.',
          ],
          dogru: 3,
          aciklama:
            "'It is widely believed that' bugünkü yaygın bir kanıyı (inanılmaktadır), 'was much warmer' ise antik çağdaki durumu (çok daha sıcak olduğuna) anlatır. 'pek çok kişi … daha sıcak olacağına inanıyordu' çevirisi inanmayı antik çağa taşır ve zamanı bozar. 'olup olmadığı … tartışılmaktadır' çevirisi inanmayı tartışmaya çevirir, 'çok sıcak olduğu için insanlar buna … inanıyordu' çevirisi ise olmayan bir sebep ilişkisi kurar.",
        },
        {
          tur: 'konus',
          id: 'sinav-u3-d1-a10',
          cumle: 'The hypothesis was tested in a series of experiments.',
          anlam: 'Hipotez bir dizi deneyle sınandı.',
          ipucu:
            "'hypothesis' hay-PO-thı-sis: vurgu ikinci hecede, 'th' dil ucu dişler arasında. 'series' Sİ-riiz diye okunur.",
        },
      ],
    },
    {
      id: 'sinav-u3-d2',
      gorsel: '🛠️',
      baslik: 'Ettirgen Yapı (Causative) ve Aktarma Edilgeni',
      not: `**Ettirgen yapı (causative)** işi başkasına yaptırmayı anlatır.

- **have + nesne + V3 / get + nesne + V3:** bir şeyi yaptırmak (işi kimin yaptığı önemsiz)
- **have + kişi + V1:** birine bir şey yaptırmak
- **get + kişi + to V1:** birini bir şeye ikna etmek
- **make + kişi + V1:** zorlamak; edilgeni: **be made to V1**
- **let + kişi + V1:** izin vermek (edilgeni: be allowed to)

Örnekler:
- We **had the roof repaired** last week. (Geçen hafta çatıyı tamir ettirdik.)
- The professor **had his students read** three articles. (Profesör öğrencilerine üç makale okuttu.)
- She finally **got her manager to approve** the plan. (Sonunda müdürünü planı onaylamaya ikna etti.)
- The prisoners **were made to work** long hours. (Mahkûmlar uzun saatler çalıştırıldı.)
- The school **doesn't let students use** phones in class. (Okul, öğrencilerin derste telefon kullanmasına izin vermiyor.)

**Sınav taktiği:** have/get'ten sonraki nesne eylemi **yapıyor** mu, eyleme **maruz mı kalıyor**? Bina, rapor, araba gibi nesneler kendiliğinden bir şey yapamaz → V3. Nesne bir kişiyse: have → V1, get → to V1. Aktarma edilgeninde (is said / is thought) eylem daha önce olduysa "to have V3" seç.

**Sık yapılan hata:** "made him to sign" demek. Etken cümlede make'ten sonra "to" gelmez; yalnızca edilgende gelir: "He was made to sign".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u3-d2-a1',
          soru: 'The university had the old library building ___ by a team of experienced architects.',
          secenekler: ['renovate', 'to renovate', 'renovating', 'renovated', 'be renovated'],
          dogru: 3,
          aciklama:
            "Bina yenileyen değil yenilenen şeydir ve 'by a team of … architects' işi yapanı gösterir: have + nesne + V3 (had the building renovated). 'renovate' kalıbı 'have + kişi + V1' içindir; nesne bir kişi değil. 'be renovated' have'den sonra kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d2-a2',
          soru: 'The manager got his assistant ___ the report before the board meeting.',
          secenekler: ['revise', 'to revise', 'revised', 'has revised', 'be revised'],
          dogru: 1,
          aciklama:
            "Nesne bir kişidir (his assistant) ve işi o yapar; get ile kişi nesneden sonra 'to V1' gelir: got his assistant to revise. 'revise' have kalıbında doğru olurdu (had his assistant revise) ama get ile 'to' gerekir. 'revised' nesnenin işi yapmadığı durumlar içindir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d2-a3',
          soru: 'During the interrogation, the suspect was made ___ a statement against his will.',
          secenekler: ['sign', 'signing', 'to sign', 'signed', 'to be signed'],
          dogru: 2,
          aciklama:
            "'make' edilgen yapıda kullanıldığında ardından 'to V1' gelir: was made to sign. Etken cümlede 'made him sign' doğru olurdu, bu yüzden 'sign' güçlü çeldiricidir. 'to be signed' şüphelinin imzalanan şey olduğunu söyler, anlam bozulur.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d2-a4',
          soru: 'Many parents do not let their children ___ social media until they are teenagers.',
          secenekler: ['to use', 'using', 'used', 'use', 'be used'],
          dogru: 3,
          aciklama:
            "'let + kişi + V1' kalıbında 'to' kullanılmaz: let their children use. 'to use' allow ile doğru olurdu (allow them to use), bu yüzden en güçlü çeldiricidir. 'used' ve 'be used' çocukları kullanılan şey hâline getirir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d2-a5',
          soru: 'Before travelling abroad, you should ___ your passport checked to make sure it has not expired.',
          secenekler: ['get', 'make', 'let', 'take', 'do'],
          dogru: 0,
          aciklama:
            "Pasaport kontrol eden değil kontrol edilen şeydir: get/have + nesne + V3 (get your passport checked). 'make' ve 'let' ardından nesne + V1 ister ve zorlama/izin anlamı verir. 'take' ve 'do' ettirgen kalıp kurmaz.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u3-d2-a6',
          ciftler: [
            ['renovate', 'yenilemek'],
            ['revise', 'gözden geçirmek'],
            ['statement', 'ifade'],
            ['expire', 'süresi dolmak'],
            ['board', 'yönetim kurulu'],
            ['suspect', 'şüpheli'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u3-d2-a7',
          cumle: 'The company had its headquarters redesigned by a famous architect.',
          anlam: 'Şirket genel merkezini ünlü bir mimara yeniden tasarlattı.',
          celdiriciler: ['redesign', 'made', 'to'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u3-d2-a8',
          kaynak: 'Arabamı her yıl kontrol ettiririm.',
          cevaplar: [
            'I have my car checked every year.',
            'I get my car checked every year.',
            'I have my car inspected every year.',
            'I get my car inspected every year.',
            'I have my car serviced every year.',
            'I get my car serviced every year.',
            'I have my car checked annually.',
            'I have my car checked each year.',
            'I have my car inspected annually.',
            'I have my car inspected each year.',
            'I have my car serviced annually.',
            'I have my car serviced each year.',
            'I get my car checked annually.',
            'I get my car checked each year.',
            'I get my car inspected annually.',
            'I get my car inspected each year.',
            'I get my car serviced annually.',
            'I get my car serviced each year.',
          ],
          aciklama:
            "'kontrol ettiririm' işi başkasına yaptırmaktır: have/get + nesne + V3. Araba kontrol eden değil kontrol edilen şey olduğu için V3 (checked) gelir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u3-d2-a9',
          soru: 'The workers were made to work overtime without extra pay.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The workers chose to work overtime even though they were not paid extra.',
            'The workers refused to work overtime because they would not be paid extra.',
            'The workers were forced to work overtime, but they were not paid extra for it.',
            'The workers were allowed to work overtime in return for extra pay.',
            'The workers had someone else work overtime instead of them.',
          ],
          dogru: 2,
          aciklama:
            "'were made to work' zorlamayı anlatır (were forced to work), 'without extra pay' ise ek ücret ödenmediğini söyler. 'chose to work overtime' zorlamayı gönüllü bir seçime çevirir. 'refused to work overtime' seçeneğinde işçiler fazla mesaiyi reddeder, 'were allowed to … in return for extra pay' seçeneğinde ise izin ve ek ücret vardır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d2-a10',
          soru: 'The new director is said ___ several important reforms during her previous term in office.',
          secenekler: [
            'to introduce',
            'introducing',
            'having introduced',
            'that she introduced',
            'to have introduced',
          ],
          dogru: 4,
          aciklama:
            "'is said' bugün söylenen bir şeyi, 'during her previous term' ise reformların daha önce yapıldığını gösterir; önceki eylem 'to have V3' ile verilir. 'to introduce' söylemle aynı zamanı ya da geleceği anlatır, 'previous term' ile uyuşmaz. 'that she introduced' ancak 'It is said that…' kalıbında doğru olurdu.",
        },
      ],
    },
    {
      id: 'sinav-u3-d3',
      gorsel: '💭',
      baslik: 'Koşul Cümleleri ve Wish',
      not: `Koşul cümleleri (conditionals) sınavın en sevdiği zaman uyumlarından biridir.

- Type 1 (gerçek): If + present, **will** V1
- Type 2 (şimdi/gelecek, hayalî): If + V2, **would** V1
- Type 3 (geçmiş, hayalî): If + had V3, **would have** V3
- Karma: If + had V3, would V1 (+ now)
- Devrik: **Had** I known… / **Were** it not for… / **Should** you need…
- unless (= if not), provided/providing that, as long as, on condition that
- but for / without + isim = if it weren't / hadn't been for
- wish / if only: şimdi → V2; geçmiş → had V3; şikâyet → would V1

Örnekler:
- If the data **had been** accurate, the results **would have been** different. (Veriler doğru olsaydı sonuçlar farklı olurdu.)
- **Had** we **left** earlier, we **would have caught** the train. (Daha erken çıksaydık treni yakalardık.)
- **But for** your help, I **would have failed**. (Senin yardımın olmasaydı başarısız olurdum.)
- I **wish** I **had** more time. (Keşke daha fazla zamanım olsa.)

**Sınav taktiği:** Ana cümlede "would have V3" görürsen yan cümlede "had V3" ya da devrik "Had + özne + V3" ara. Boşluktan sonra yalnızca bir isim öbeği varsa (the support of…) but for / without seç.

**Sık yapılan hata:** "If I would have known" demek. If cümlesinde would kullanılmaz: "If I had known".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u3-d3-a1',
          soru: "If the government had invested more in flood defences, last year's damage ___ much less severe.",
          secenekler: ['will be', 'is', 'had been', 'would be', 'would have been'],
          dogru: 4,
          aciklama:
            "If cümlesi 'had invested' (past perfect) ve 'last year's damage' geçmişteki gerçek dışı bir durumu anlatır: Type 3 → would have been. 'would be' karma koşulda şimdiki sonuç için kullanılır, ama geçen yılın hasarı geçmişe aittir. 'had been' if cümlesinin zamanıdır, ana cümlede kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d3-a2',
          soru: '___ the generous support of private donors, the research centre would have closed years ago.',
          secenekler: ['Unless', 'But for', 'Provided that', 'In case', 'As long as'],
          dogru: 1,
          aciklama:
            "Boşluktan sonra tam cümle değil bir isim öbeği var (the generous support of private donors) ve ana cümle gerçek dışı geçmiş (would have closed): 'But for' (= If it hadn't been for, … olmasaydı). 'Unless', 'Provided that', 'In case' ve 'As long as' ardından tam cümle ister.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d3-a3',
          soru: "The patient will make a full recovery ___ she follows the doctor's instructions carefully.",
          secenekler: ['provided that', 'unless', 'but for', 'even if', 'otherwise'],
          dogru: 0,
          aciklama:
            "İyileşme, doktorun talimatlarına uyma şartına bağlıdır: provided that (-mesi şartıyla). 'unless' (= if not) anlamı tersine çevirir: talimatlara uymazsa iyileşecek. 'even if' de mantıksızdır, çünkü talimatlara uymak iyileşmenin önünde bir engel değildir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d3-a4',
          soru: '___ the risks involved, the investors would never have supported the project.',
          secenekler: [
            'If they knew',
            'Were they known',
            'Had they known',
            'Should they know',
            'Unless they had known',
          ],
          dogru: 2,
          aciklama:
            "Ana cümle 'would never have supported' Type 3'tür; if cümlesi past perfect ister ve devrik hâli 'Had they known' olur. 'If they knew' Type 2'dir, geçmişle uyuşmaz. 'Unless they had known' (= if they had not known) anlamı tersine çevirir: 'riskleri bilmeselerdi asla desteklemezlerdi' demiş olur. 'Should they know' ise geleceğe dönük gerçek koşuldur (Type 1).",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u3-d3-a5',
          soru: 'Many residents now wish the city council ___ the old park instead of allowing a shopping centre to be built there last year.',
          secenekler: ['protects', 'will protect', 'has protected', 'had protected', 'protected'],
          dogru: 3,
          aciklama:
            "'last year' pişmanlığın geçmişteki bir olayla ilgili olduğunu gösterir; geçmişe dair wish 'had V3' ister: wish … had protected. 'protected' wish ile şimdiki zaman için kullanılır, geçen yılki bir karara uymaz. Diğer şıklar wish ile kullanılmaz.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u3-d3-a6',
          ciftler: [
            ['recovery', 'iyileşme'],
            ['donor', 'bağışçı'],
            ['resident', 'bölge sakini'],
            ['investor', 'yatırımcı'],
            ['severe', 'şiddetli'],
            ['flood', 'sel'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u3-d3-a7',
          cumle: 'Had the warning been taken seriously, many lives would have been saved.',
          anlam: 'Uyarı ciddiye alınsaydı pek çok hayat kurtarılırdı.',
          celdiriciler: ['If', 'will', 'saving'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u3-d3-a8',
          kaynak: 'Keşke daha fazla zamanım olsa.',
          cevaplar: [
            'I wish I had more time.',
            'If only I had more time.',
            'I wish that I had more time.',
          ],
          aciklama: 'Şimdiki zamana dair gerçek dışı bir istek: wish / if only + V2 (had).',
        },
        {
          tur: 'secmeli',
          id: 'sinav-u3-d3-a9',
          soru: 'Gerekli önlemler zamanında alınmasaydı, salgın çok daha geniş bir alana yayılırdı.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'If the necessary measures are not taken in time, the epidemic will spread to a much wider area.',
            'Had the necessary measures not been taken in time, the epidemic would have spread to a much wider area.',
            'Unless the necessary measures were taken in time, the epidemic would spread to a wider area.',
            'The epidemic spread to a much wider area because the necessary measures were not taken in time.',
            'Even though the necessary measures were taken in time, the epidemic spread to a much wider area.',
          ],
          dogru: 1,
          aciklama:
            "'alınmasaydı … yayılırdı' geçmişe ait gerçek dışı bir koşuldur (önlemler aslında alındı): Type 3, devrik hâliyle 'Had … not been taken, … would have spread'. 'If … are not taken …, will spread' gerçek koşuldur (Type 1). 'because' ve 'Even though' ile kurulan seçenekler salgının gerçekten yayıldığını söyler, oysa Türkçe cümle yayılmadığını ima eder.",
        },
        {
          tur: 'konus',
          id: 'sinav-u3-d3-a10',
          cumle: 'If the data had been accurate, the conclusion would have been different.',
          anlam: 'Veriler doğru olsaydı sonuç farklı olurdu.',
          ipucu:
            "'accurate' EK-yı-rıt: vurgu ilk hecede, son hece 'reyt' değil 'rıt'. 'conclusion' kın-KLUU-jın.",
        },
      ],
    },
  ],
};

const U4: Unite = {
  id: 'sinav-u4',
  gorsel: '🧩',
  seviye: 'B2',
  baslik: 'Cümlecikler ve Fiilimsiler',
  ozet: 'Uzun akademik cümleleri çözmenin anahtarı olan sıfat ve isim cümleciklerini, kısaltılmış yapıları ve gerund/infinitive seçimini öğrenirsin.',
  dersler: [
    {
      id: 'sinav-u4-d1',
      gorsel: '👉',
      baslik: 'Sıfat Cümlecikleri (Relative Clauses)',
      not: `Sıfat cümlecikleri (relative clauses) bir ismi tanımlar ve uzun akademik cümlelerin temel yapı taşıdır.

- **who:** kişi (özne) — **whom:** kişi (nesne, özellikle edattan sonra)
- **which:** şey/hayvan; virgülden sonra bütün bir cümleyi de niteleyebilir
- **that:** kişi ya da şey; virgülden sonra ve edattan sonra kullanılmaz
- **whose:** sahiplik (+ isim)
- **where / in which:** yer — **when / during which:** zaman

Örnekler:
- The scientist **whose** findings changed the field won an award. (Bulguları alanı değiştiren bilim insanı ödül kazandı.)
- This is the village **where** the poet was born. (Burası şairin doğduğu köy.)
- The researcher **with whom** we worked has retired. (Birlikte çalıştığımız araştırmacı emekli oldu.)
- The plan was rejected, **which** surprised everyone. (Plan reddedildi; bu da herkesi şaşırttı.)

**Sınav taktiği:** Boşluktan sonrasına bak. Hemen bir isim + fiil geliyorsa (… ___ research won …) whose; eksiksiz bir cümle geliyorsa (özne + fiil + gerekli nesne) where / when / in which; doğrudan fiil geliyorsa who / which. Virgül ya da edattan sonra "that" şıkkını hemen ele.

**Sık yapılan hata:** "where" ile "which"i karıştırmak: "the city **which** I visited" (visit nesne alır) ama "the city **where** I was born".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u4-d1-a1',
          soru: 'Marie Curie, ___ research on radioactivity won her two Nobel Prizes, was the first woman to teach at the Sorbonne.',
          secenekler: ['who', 'whose', 'which', 'that', 'whom'],
          dogru: 1,
          aciklama:
            "Boşluktan hemen sonra bir isim (research) ve onun fiili (won) gelir; araştırma Marie Curie'ye aittir: whose. 'who' ardından doğrudan fiil isterdi. 'that' virgülden sonra kullanılmaz, 'which' ise kişi için kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d1-a2',
          soru: 'The laboratory ___ the vaccine was developed has been turned into a museum.',
          secenekler: ['which', 'that', 'where', 'whose', 'what'],
          dogru: 2,
          aciklama:
            "Boşluktan sonra eksiksiz bir cümle var (the vaccine was developed); eksik bir özne ya da nesne yok, eksik olan yer bilgisi: where (= in which). 'which' ve 'that' cümlede eksik bir özne ya da nesne olsaydı uygun olurdu. 'what' bir ismi nitelemek için kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d1-a3',
          soru: 'The committee rejected the proposal, ___ surprised many observers.',
          secenekler: ['that', 'what', 'who', 'which', 'whose'],
          dogru: 3,
          aciklama:
            "Virgülden sonraki cümlecik yalnızca 'proposal'ı değil, bütün bir olayı (önerinin reddedilmesini) niteler; bu görevi yalnızca 'which' yapar. 'that' virgülden sonra kullanılamaz. 'what' bir önceki cümleye gönderme yapmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d1-a4',
          soru: 'The scientist with ___ we collaborated on the project has recently retired.',
          secenekler: ['who', 'that', 'which', 'whose', 'whom'],
          dogru: 4,
          aciklama:
            "Edattan (with) sonra kişi için yalnızca 'whom' kullanılır. 'that' edattan sonra gelemez; 'who' da resmî İngilizcede edattan sonra kullanılmaz. 'which' kişi için kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d1-a5',
          soru: 'The period ___ the Industrial Revolution took place saw rapid population growth in European cities.',
          secenekler: ['during which', 'which', 'where', 'whose', 'that'],
          dogru: 0,
          aciklama:
            "Boşluktan sonra eksiksiz bir cümle var (the Industrial Revolution took place) ve nitelenen isim bir zaman dilimidir (period): during which (= when). 'which' ve 'that' tek başına eksik bir özne ya da nesne gerektirir. 'where' yer içindir.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u4-d1-a6',
          ciftler: [
            ['collaborate', 'iş birliği yapmak'],
            ['observer', 'gözlemci'],
            ['proposal', 'öneri'],
            ['reject', 'reddetmek'],
            ['retire', 'emekli olmak'],
            ['growth', 'büyüme'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u4-d1-a7',
          cumle: 'The region where the fossils were found is now a protected area.',
          anlam: 'Fosillerin bulunduğu bölge şimdi koruma altındaki bir alan.',
          celdiriciler: ['which', 'founded', 'whose'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u4-d1-a8',
          kaynak: 'Kitabını okuduğum yazar bugün konuşma yapacak.',
          cevaplar: [
            'The author whose book I read will give a speech today.',
            'The writer whose book I read will give a speech today.',
            'The author whose book I read will give a talk today.',
            'The writer whose book I read will give a talk today.',
            'The author whose book I read will speak today.',
            'The writer whose book I read will speak today.',
            'The author whose book I have read will give a speech today.',
            'The author whose book I read is going to give a speech today.',
            'The author whose book I read will make a speech today.',
            'The author whose book I read is going to give a talk today.',
            'The author whose book I read is going to speak today.',
            'The author whose book I read is giving a talk today.',
            'The author whose book I read is giving a speech today.',
            'The author whose book I have read will give a talk today.',
            'The author whose book I have read will speak today.',
            'The author whose book I have read will make a speech today.',
            'The author whose book I have read is going to give a speech today.',
            'The author whose book I have read is going to give a talk today.',
            'The author whose book I have read is going to speak today.',
            'The author whose book I have read is giving a talk today.',
            'The author whose book I have read is giving a speech today.',
            'The writer whose book I read will make a speech today.',
            'The writer whose book I read is going to give a speech today.',
            'The writer whose book I read is going to give a talk today.',
            'The writer whose book I read is going to speak today.',
            'The writer whose book I read is giving a talk today.',
            'The writer whose book I read is giving a speech today.',
            'The writer whose book I have read will give a speech today.',
            'The writer whose book I have read will give a talk today.',
            'The writer whose book I have read will speak today.',
            'The writer whose book I have read will make a speech today.',
            'The writer whose book I have read is going to give a speech today.',
            'The writer whose book I have read is going to give a talk today.',
            'The writer whose book I have read is going to speak today.',
            'The writer whose book I have read is giving a talk today.',
            'The writer whose book I have read is giving a speech today.',
          ],
          aciklama:
            "'Kitabını okuduğum yazar' sahiplik bildirir: the author whose book I read. 'whose'dan sonra sahip olunan isim (book) gelir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u4-d1-a9',
          soru: 'The students whose projects were selected will present them at the international conference held in Ankara.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            "Ankara'da düzenlenen uluslararası konferansta projelerini sunacak öğrenciler seçildi.",
            "Öğrencilerin seçtiği projeler, Ankara'da düzenlenecek uluslararası konferansta sunulacak.",
            "Ankara'daki uluslararası konferansta sunulan projeleri seçen öğrenciler ödüllendirilecek.",
            "Projeleri seçilmeyen öğrenciler, uluslararası konferansa katılmak için Ankara'ya gidecekler.",
            "Projeleri seçilen öğrenciler, onları Ankara'da düzenlenen uluslararası konferansta sunacaklar.",
          ],
          dogru: 4,
          aciklama:
            "Ana özne 'The students', ana yüklem 'will present' (sunacaklar); 'whose projects were selected' öğrencileri niteler: projeleri seçilen öğrenciler. 'Öğrencilerin seçtiği projeler' çevirisi edilgeni etkene çevirir. '… sunacak öğrenciler seçildi' çevirisi ana yüklemi 'seçildi' yapar, 'Projeleri seçilmeyen' çevirisi ise olumsuzluk ekler.",
        },
        {
          tur: 'konus',
          id: 'sinav-u4-d1-a10',
          cumle: 'The theory, which was proposed decades ago, remains controversial.',
          anlam: 'On yıllar önce ortaya atılan kuram hâlâ tartışmalı.',
          ipucu:
            "'controversial' kon-trı-VÖR-şıl: vurgu üçüncü hecede. 'theory' Tİİ-ı-ri, 'th' dil ucu dişler arasında.",
        },
      ],
    },
    {
      id: 'sinav-u4-d2',
      gorsel: '✂️',
      baslik: 'Kısaltılmış Sıfat Cümlecikleri ve Participle Yapıları',
      not: `Sıfat cümlecikleri kısaltılabilir; bu, sınavdaki uzun cümlelerin en sık kullandığı yapıdır.

- Etken (who/which + fiil) → **V-ing**: students who wish → students **wishing**
- Edilgen (which was done) → **V3**: the bridge which was built → the bridge **built**
- the first / the last / the only + isim → **to V1**: the first woman **to win**
- Cümle başı participle: aynı anda → V-ing; önce tamamlanan → **Having V3**; edilgen → V3 ya da Having been V3

Örnekler:
- Students **wishing** to apply must register online. (Başvurmak isteyen öğrenciler çevrim içi kayıt olmalı.)
- The bridge **built** in 1890 is still in use. (1890'da yapılan köprü hâlâ kullanılıyor.)
- She was the first woman **to win** the prize. (Ödülü kazanan ilk kadındı.)
- **Having completed** the survey, the team analysed the data. (Anketi tamamladıktan sonra ekip verileri analiz etti.)

**Sınav taktiği:** Boşluktan önceki isim eylemi **yapıyorsa** V-ing, eylemden **etkileniyorsa** V3. Cümle başındaki participle'ın öznesi virgülden sonraki öznedir; eylem ana cümleden önce bittiyse "Having V3" seç.

**Sık yapılan hata:** "The data collecting by the team" demek. Veri toplanır, kendisi toplamaz: "the data **collected** by the team".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u4-d2-a1',
          soru: 'Most of the data ___ in the study came from hospitals in rural areas.',
          secenekler: ['using', 'used', 'to use', 'uses', 'have used'],
          dogru: 1,
          aciklama:
            "Veriler kullanan değil kullanılan şeydir: 'the data which were used' kısaltılınca 'the data used' olur. 'using' etken anlam verir (verinin bir şeyi kullanması). 'uses' ve 'have used' cümlede ikinci bir çekimli fiil yaratır; ana fiil zaten 'came'dir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d2-a2',
          soru: 'Students ___ to apply for the scholarship must submit their documents by the end of May.',
          secenekler: ['wish', 'wished', 'wishing', 'are wishing', 'to be wished'],
          dogru: 2,
          aciklama:
            "Öğrenciler isteyen taraftır (etken): 'students who wish' kısaltılınca 'students wishing' olur. 'wished' edilgen anlam verir, öğrenciler istenen şey olmaz. 'wish' ve 'are wishing' ikinci bir çekimli fiil yaratır; ana fiil 'must submit'tir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d2-a3',
          soru: '___ the experiment several times without obtaining consistent results, the researchers finally decided to change their method.',
          secenekler: [
            'Repeated',
            'Being repeated',
            'To be repeated',
            'Having repeated',
            'Having been repeated',
          ],
          dogru: 3,
          aciklama:
            "Deneyi tekrarlayan araştırmacılardır (etken) ve tekrarlama, yöntemi değiştirme kararından önce tamamlanmıştır: Having V3. 'Having been repeated' ve 'Repeated' edilgendir; araştırmacıların tekrarlandığı anlamı çıkar. Ayrıca boşluktan sonra nesne (the experiment) olduğu için etken yapı gerekir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d2-a4',
          soru: 'Neil Armstrong was the first person ___ on the surface of the Moon.',
          secenekler: ['to walk', 'walking', 'walked', 'having walked', 'walks'],
          dogru: 0,
          aciklama:
            "'the first / the last / the only + isim' kalıbından sonra kısaltılmış cümlecik 'to V1' ile kurulur: the first person to walk. 'walking' genel kısaltma kuralına uyar ama bu kalıpta kullanılmaz. 'walked' edilgen anlam verir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d2-a5',
          soru: '___ in simple and clear language, the textbook is popular among first-year students.',
          secenekler: ['Writing', 'Having written', 'To write', 'Being writing', 'Written'],
          dogru: 4,
          aciklama:
            "Virgülden sonraki özne 'the textbook'tur ve kitap yazan değil yazılan şeydir: edilgen anlam için V3 (Written). 'Writing' ve 'Having written' etkendir; kitabın bir şey yazdığı anlamını verir. 'Being writing' dil bilgisi olarak kurulamaz.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u4-d2-a6',
          ciftler: [
            ['scholarship', 'burs'],
            ['consistent', 'tutarlı'],
            ['confident', 'emin'],
            ['accurate', 'doğru, kesin'],
            ['apply for', 'başvurmak'],
            ['findings', 'bulgular'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u4-d2-a7',
          cumle: 'Having analysed the samples, the team published its findings.',
          anlam: 'Örnekleri analiz ettikten sonra ekip bulgularını yayımladı.',
          celdiriciler: ['Analysing', 'been', 'publishing'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u4-d2-a8',
          kaynak: 'Bu üniversitede okuyan öğrencilerin çoğu yabancı.',
          cevaplar: [
            'Most of the students studying at this university are foreign.',
            'Most students studying at this university are foreign.',
            'Most of the students who study at this university are foreign.',
            'Most students who study at this university are foreign.',
            'Most of the students studying at this university are international.',
            'Most students studying at this university are international.',
            'Most of the students who study at this university are international.',
            'Most students who study at this university are international.',
          ],
          aciklama:
            "'okuyan öğrenciler' etken bir sıfat cümleciğidir: students who study ya da kısaltılmış hâliyle students studying.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u4-d2-a9',
          soru: 'Having been warned about the storm, the fishermen did not go out to sea.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The fishermen went out to sea although they had been warned about the storm.',
            'The fishermen warned others about the storm before going out to sea.',
            'Since the fishermen had been warned about the storm, they did not go out to sea.',
            'The fishermen were not warned about the storm, so they went out to sea.',
            'If the fishermen had been warned about the storm, they would not have gone out to sea.',
          ],
          dogru: 2,
          aciklama:
            "'Having been warned' balıkçıların önceden uyarıldığını ve bunun denize açılmamalarının nedeni olduğunu anlatır: Since … had been warned, they did not go out. 'went out to sea although they had been warned' sonucu tersine çevirir. 'If the fishermen had been warned' ise uyarının yapılmadığını ima eden gerçek dışı bir koşuldur.",
        },
        {
          tur: 'konus',
          id: 'sinav-u4-d2-a10',
          cumle: 'Data collected from various sources were analysed statistically.',
          anlam: 'Çeşitli kaynaklardan toplanan veriler istatistiksel olarak analiz edildi.',
          ipucu: "'various' VE-ri-ıs. 'statistically' stı-TİS-tik-li: vurgu ikinci hecede.",
        },
      ],
    },
    {
      id: 'sinav-u4-d3',
      gorsel: '📦',
      baslik: 'İsim Cümlecikleri, Gerund ve Infinitive',
      not: `**İsim cümlecikleri (noun clauses)** bir cümlenin öznesi ya da nesnesi olabilir:
- that + cümle: I think **that** the plan will work.
- whether / if + cümle: I wonder **whether** it is true. (Özne konumunda ve edattan sonra yalnızca **whether**.)
- wh- sözcükleri: **How** the virus spreads is unclear.
- the fact that: **The fact that** prices rose surprised no one.

**Gerund (V-ing)** edatlardan sonra ve şu fiillerden sonra gelir: avoid, deny, consider, involve, risk, look forward to, be committed to, object to.
**Infinitive (to V1)** şu fiillerden sonra gelir: decide, aim, fail, manage, tend, refuse, seem, afford.

Örnekler:
- **Whether** the treatment works remains unclear. (Tedavinin işe yarayıp yaramadığı belirsizliğini koruyor.)
- The study focuses on **how** stress affects sleep. (Çalışma, stresin uykuyu nasıl etkilediğine odaklanıyor.)
- They avoided **making** promises. (Söz vermekten kaçındılar.)
- The project failed **to attract** investors. (Proje yatırımcı çekmeyi başaramadı.)

**Sınav taktiği:** Boşluk bir edattan sonraysa (in, on, of, by, without; look forward to, committed to) V-ing seç. Boşluk cümlenin başındaysa ve ardından tam bir cümle ile ikinci bir fiil geliyorsa (… remains unclear) whether / what / how gibi bir isim cümleciği bağlacı ara; "if" özne konumunda kullanılmaz.

**Sık yapılan hata:** "I look forward to see you" demek. Buradaki "to" edattır: "look forward to **seeing** you".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u4-d3-a1',
          soru: '___ the new drug will be approved by the authorities remains uncertain.',
          secenekler: ['If', 'Whether', 'What', 'Unless', 'Which'],
          dogru: 1,
          aciklama:
            "Boşluktaki cümlecik ana fiil 'remains'in öznesidir ve 'olup olmayacağı' anlamı taşır: Whether. 'If' de 'olup olmadığı' anlamına gelebilir ama özne konumunda kullanılmaz. 'What' ardından eksik bir öğe ister; 'the new drug will be approved' cümlesi eksiksizdir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d3-a2',
          soru: 'Many researchers have avoided ___ firm conclusions because the sample size was too small.',
          secenekler: ['to draw', 'draw', 'drawn', 'drawing', 'to have drawn'],
          dogru: 3,
          aciklama:
            "'avoid' fiilinden sonra her zaman gerund (V-ing) gelir: avoided drawing. 'to draw' decide, fail gibi fiillerden sonra doğru olurdu, bu yüzden güçlü çeldiricidir. 'drawn' ve 'draw' have avoided'dan sonra kullanılamaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d3-a3',
          soru: 'The government has failed ___ its promise to reduce air pollution in major cities.',
          secenekler: ['keeping', 'to keep', 'keep', 'kept', 'having kept'],
          dogru: 1,
          aciklama:
            "'fail' fiilinden sonra infinitive (to V1) gelir: failed to keep (-meyi başaramadı). 'keeping' avoid, deny gibi fiillerden sonra kullanılır. 'kept' ve 'keep' has failed'dan sonra yapıyı bozar.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d3-a4',
          soru: 'The study focuses on ___ social media affects the sleeping habits of teenagers.',
          secenekler: ['what', 'that', 'how', 'which', 'whose'],
          dogru: 2,
          aciklama:
            "Edattan (on) sonra bir isim cümleciği gelir ve cümlecik eksiksizdir (social media affects the sleeping habits): eksik olan yalnızca yöntem bilgisi, yani 'how' (nasıl). 'what' ancak cümlecikte eksik bir nesne olsaydı uygun olurdu. 'that' edattan sonra isim cümleciği başlatamaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u4-d3-a5',
          soru: 'Scientists are committed to ___ new ways of reducing carbon emissions.',
          secenekler: ['find', 'found', 'be finding', 'have found', 'finding'],
          dogru: 4,
          aciklama:
            "'be committed to' kalıbındaki 'to' bir edattır, mastar eki değildir; edattan sonra gerund gelir: committed to finding. 'find' en güçlü çeldiricidir çünkü 'to'yu mastar sanmak kolaydır. 'found' ise 'kurmak' fiilidir ya da find'ın V2/V3 hâlidir, burada uymaz.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u4-d3-a6',
          ciftler: [
            ['emission', 'salınım'],
            ['approve', 'onaylamak'],
            ['conclusion', 'sonuç, çıkarım'],
            ['committed to', 'kendini adamış'],
            ['habit', 'alışkanlık'],
            ['authority', 'yetkili makam'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u4-d3-a7',
          cumle: 'Whether the policy will succeed depends on public support.',
          anlam: 'Politikanın başarılı olup olmayacağı halkın desteğine bağlı.',
          celdiriciler: ['If', 'succeeds', 'That'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u4-d3-a8',
          kaynak: 'Sizinle çalışmayı dört gözle bekliyorum.',
          cevaplar: [
            "I'm looking forward to working with you.",
            'I look forward to working with you.',
            'I am really looking forward to working with you.',
            'I really look forward to working with you.',
          ],
          aciklama:
            "'look forward to' kalıbındaki 'to' edattır; ardından V-ing gelir: working (work değil).",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u4-d3-a9',
          soru: 'Projenin neden başarısız olduğu hâlâ tartışılıyor.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'The project failed because it is still being discussed.',
            'It is still discussed whether the project will fail.',
            'The reason why the project will fail has already been discussed.',
            'Why the project failed is still being discussed.',
            'The project is still discussed although it has failed.',
          ],
          dogru: 3,
          aciklama:
            "'Projenin neden başarısız olduğu' cümlenin öznesi olan bir isim cümleciğidir: Why the project failed; 'hâlâ tartışılıyor' ise is still being discussed. 'whether the project will fail' 'neden' yerine 'olup olmayacağını' koyar. 'failed because it is still being discussed' olmayan bir sebep ilişkisi kurar, 'The reason why the project will fail' ise zamanı geleceğe çevirir.",
        },
        {
          tur: 'konus',
          id: 'sinav-u4-d3-a10',
          cumle: 'The fact that the climate is changing is widely accepted.',
          anlam: 'İklimin değişmekte olduğu gerçeği geniş çapta kabul görüyor.',
          ipucu:
            "'climate' KLAY-mıt: son hece 'meyt' değil 'mıt'. 'accepted' ık-SEP-tıd: vurgu ikinci hecede.",
        },
      ],
    },
  ],
};

const U5: Unite = {
  id: 'sinav-u5',
  gorsel: '🔗',
  seviye: 'B2',
  baslik: 'Bağlaçlar ve Geçiş İfadeleri',
  ozet: 'Cloze test ve cümle tamamlamanın çekirdeği olan zıtlık, sebep-sonuç, amaç, koşul ve ekleme bağlaçlarını yapılarıyla birlikte ayırt edersin.',
  dersler: [
    {
      id: 'sinav-u5-d1',
      gorsel: '↔️',
      baslik: 'Zıtlık: although, despite, whereas, however',
      not: `Zıtlık bağlaçları cloze test ve cümle tamamlama sorularının en sık konusudur. Önce **yapıya**, sonra **anlama** bak.

- **although / even though / though** + tam cümle
- **despite / in spite of** + isim ya da V-ing (despite the fact that + cümle)
- **whereas / while** + cümle: iki şeyi karşılaştırır ("-iken, oysa")
- **however / nevertheless / nonetheless**: nokta ya da noktalı virgülden sonra, virgülle
- **but / yet**: iki cümleyi ortadan bağlar

Örnekler:
- **Although** it was raining, the match continued. (Yağmur yağmasına rağmen maç devam etti.)
- **Despite** the rain, the match continued. (Yağmura rağmen maç devam etti.)
- Some students prefer online classes, **whereas** others prefer the classroom. (Bazı öğrenciler çevrim içi dersleri tercih ederken diğerleri sınıfı tercih ediyor.)
- The plan was expensive. **Nevertheless**, it was approved. (Plan pahalıydı. Yine de onaylandı.)

**Sınav taktiği:** Boşluktan sonra yalnızca isim öbeği varsa despite / in spite of / because of / due to; tam cümle varsa although / whereas / because; nokta ya da noktalı virgülden sonra virgül geliyorsa however / therefore / moreover. Sonra iki yan arasındaki ilişkiyi adlandır: beklenti tersine mi dönüyor (zıtlık), yoksa biri diğerinin sonucu mu?

**Sık yapılan hata:** "despite of" ya da "despite it was raining" demek. Despite'tan sonra "of" gelmez ve tam cümle gelmez.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u5-d1-a1',
          soru: '___ the economy grew by three per cent last year, unemployment remained high.',
          secenekler: ['Despite', 'Although', 'Because', 'However', 'In spite of'],
          dogru: 1,
          aciklama:
            "Boşluktan sonra tam bir cümle var (the economy grew …) ve iki yan arasında beklentiye ters bir ilişki var: ekonomi büyüdü ama işsizlik yüksek kaldı → Although. 'Despite' ve 'In spite of' anlam olarak doğru ama tam cümle almaz. 'Because' sebep-sonuç kurar, mantığı bozar.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d1-a2',
          soru: '___ heavy investment in public transport, traffic congestion in the city has worsened.',
          secenekler: ['Even though', 'Whereas', 'Despite', 'Due to', 'Nevertheless'],
          dogru: 2,
          aciklama:
            "Boşluktan sonra yalnızca bir isim öbeği (heavy investment in public transport) var ve anlam zıtlık içeriyor: yatırım yapıldı ama trafik kötüleşti → Despite. 'Even though' ve 'Whereas' tam cümle ister. 'Due to' isim alır ama sebep bildirir; yatırımın trafiği kötüleştirdiğini söylemek mantıksızdır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d1-a3',
          soru: 'Some birds migrate thousands of kilometres every year, ___ others spend their entire lives in the same area.',
          secenekler: ['whereas', 'despite', 'because', 'so that', 'unless'],
          dogru: 0,
          aciklama:
            "Cümle iki kuş grubunu karşılaştırıyor: bazıları göç ederken diğerleri aynı yerde kalıyor; iki durumu karşılaştıran bağlaç 'whereas'tır. 'despite' tam cümle almaz. 'because' ve 'so that' sebep ya da amaç ilişkisi kurar, burada yoktur.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d1-a4',
          soru: 'The first trials of the drug produced promising results. ___, later studies failed to confirm these findings.',
          secenekler: ['Therefore', 'Moreover', 'For instance', 'However', 'Similarly'],
          dogru: 3,
          aciklama:
            "Birinci cümle umut verici sonuçlardan, ikinci cümle bu sonuçların doğrulanamamasından söz ediyor; bu bir zıtlıktır: However. 'Therefore' sonuç bildirir, oysa olumlu sonuçlar doğrulanmamayı açıklamaz. 'Moreover' ve 'Similarly' aynı yönde bilgi ekler.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d1-a5',
          soru: 'The project was completed on time, ___ the team faced a series of unexpected technical problems.',
          secenekler: ['because of', 'in spite of', 'so', 'as a result', 'even though'],
          dogru: 4,
          aciklama:
            "Boşluktan sonra tam bir cümle var (the team faced …) ve beklentiye ters bir durum anlatılıyor: sorunlara rağmen proje zamanında bitti → even though. 'in spite of' anlamca doğru ama tam cümle almaz. 'so' ve 'as a result' sorunları zamanında bitirmenin sonucu gibi gösterir.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u5-d1-a6',
          ciftler: [
            ['whereas', 'oysa, -iken'],
            ['nevertheless', 'yine de'],
            ['despite', '-e rağmen'],
            ['congestion', 'tıkanıklık'],
            ['migrate', 'göç etmek'],
            ['confirm', 'doğrulamak'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u5-d1-a7',
          cumle: 'Despite the high costs, the government continued to fund the project.',
          anlam: 'Yüksek maliyetlere rağmen hükümet projeyi finanse etmeye devam etti.',
          celdiriciler: ['Although', 'of', 'however'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u5-d1-a8',
          kaynak: 'Yağmura rağmen maç oynandı.',
          cevaplar: [
            'Despite the rain, the match was played.',
            'In spite of the rain, the match was played.',
            'The match was played despite the rain.',
            'The match was played in spite of the rain.',
            'Despite the rain, the game was played.',
            'In spite of the rain, the game was played.',
            'The game was played despite the rain.',
            'The game was played in spite of the rain.',
            'Although it rained, the match was played.',
            'The match was played although it rained.',
            'Although it was raining, the match was played.',
            'The match was played although it was raining.',
            'Even though it rained, the match was played.',
            'The match was played even though it rained.',
            'Even though it was raining, the match was played.',
            'The match was played even though it was raining.',
            'Though it rained, the match was played.',
            'The match was played though it rained.',
            'Though it was raining, the match was played.',
            'The match was played though it was raining.',
            'Although it rained, the game was played.',
            'The game was played although it rained.',
            'Although it was raining, the game was played.',
            'The game was played although it was raining.',
            'Even though it rained, the game was played.',
            'The game was played even though it rained.',
            'Even though it was raining, the game was played.',
            'The game was played even though it was raining.',
            'Though it rained, the game was played.',
            'The game was played though it rained.',
            'Though it was raining, the game was played.',
            'The game was played though it was raining.',
          ],
          aciklama:
            "'Yağmura rağmen' bir isim öbeğidir; isimle 'despite' ya da 'in spite of' kullanılır. 'oynandı' edilgendir: was played.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d1-a9',
          soru: 'Although many newspapers have lowered their prices, ___.',
          secenekler: [
            'more people have started to buy printed newspapers',
            'the number of people who read printed newspapers continues to decline',
            'this is why they have attracted a large number of new readers',
            'readers are now able to buy them more cheaply than before',
            'they have therefore become more popular among young readers',
          ],
          dogru: 1,
          aciklama:
            "'Although' bir zıtlık ister: fiyatlar düşürüldü, beklenen okuyucu artışıdır, ama okuyucu sayısı azalmaya devam ediyor. Okuyucu artışından söz eden seçenekler beklenen sonucu verir, zıtlık kurmaz; içlerindeki 'this is why' ve 'therefore' de although ile çelişir. 'readers are now able to buy them more cheaply' ise fiyat düşüşünün doğal sonucudur.",
        },
        {
          tur: 'konus',
          id: 'sinav-u5-d1-a10',
          cumle: 'Nevertheless, the results should be interpreted with caution.',
          anlam: 'Yine de sonuçlar dikkatle yorumlanmalı.',
          ipucu:
            "'nevertheless' ne-vı-dhı-LES: vurgu son hecede. 'interpreted' in-TÖR-pri-tıd: vurgu ikinci hecede. 'caution' KOO-şın.",
        },
      ],
    },
    {
      id: 'sinav-u5-d2',
      gorsel: '🎯',
      baslik: 'Sebep, Sonuç ve Amaç',
      not: `Sebep, sonuç ve amaç ilişkileri sınavda hem yapı hem anlam olarak sorulur.

- Sebep: **because / since / as** + cümle; **because of / due to / owing to** + isim
- Sonuç: **so** (cümle ortasında); **therefore / thus / consequently / as a result** (yeni cümle başında, virgülle); **hence** + isim de alabilir: hence the name
- Derece-sonuç: **so** + sıfat/zarf + that; **such** (a/an) + sıfat + isim + that
- Amaç: **so that / in order that** + cümle (genellikle can/could/will/would); **in order to / so as to** + V1

Örnekler:
- The flight was delayed **due to** fog. (Uçuş sis nedeniyle ertelendi.)
- The road was icy; **therefore**, it was closed. (Yol buzluydu; bu nedenle kapatıldı.)
- The book was **so** popular **that** it sold out in a week. (Kitap o kadar popülerdi ki bir haftada tükendi.)
- It was **such** a difficult test **that** few passed. (O kadar zor bir sınavdı ki çok az kişi geçti.)
- Speak slowly **so that** everyone **can** understand. (Herkes anlayabilsin diye yavaş konuş.)

**Sınav taktiği:** "___ complex that" gibi boşluktan sonra sıfat + that varsa so; isim öbeği + that varsa such seç. Boşluktan sonra özne + can/could geliyorsa amaç bildiren so that'i düşün.

**Sık yapılan hata:** "due to + tam cümle" kullanmak: "due to it was foggy" yanlış; "due to the fog" ya da "because it was foggy" doğrudur.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u5-d2-a1',
          soru: 'The flight was cancelled ___ the dense fog over the airport.',
          secenekler: ['because', 'due to', 'so that', 'therefore', 'although'],
          dogru: 1,
          aciklama:
            "Boşluktan sonra yalnızca bir isim öbeği (the dense fog) var ve sis iptalin sebebidir: due to. 'because' anlamca doğru ama tam cümle ister (because there was fog). 'therefore' sonuç bildirir ve cümle başında kullanılır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d2-a2',
          soru: 'The experiment was ___ complex that only a few laboratories in the world could repeat it.',
          secenekler: ['such', 'too', 'so', 'very', 'enough'],
          dogru: 2,
          aciklama:
            "Boşluktan sonra bir sıfat (complex) ve 'that' ile başlayan bir sonuç cümlesi gelir: so + sıfat + that. 'such' ardından isim öbeği ister (such a complex experiment that). 'too' ve 'very' 'that' ile sonuç cümlesi kurmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d2-a3',
          soru: 'The government lowered interest rates ___ businesses could borrow money more easily.',
          secenekler: ['in order to', 'because of', 'as if', 'despite', 'so that'],
          dogru: 4,
          aciklama:
            "Boşluktan sonra özne + could ile kurulmuş bir cümle var ve faiz indiriminin amacını anlatıyor: so that. 'in order to' de amaç bildirir ama ardından özne değil yalın fiil gelir. 'because of' ve 'despite' isim alır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d2-a4',
          soru: 'The region receives very little rainfall; ___, agriculture there depends heavily on irrigation.',
          secenekler: ['consequently', 'however', 'whereas', 'in contrast', 'otherwise'],
          dogru: 0,
          aciklama:
            "Az yağış almak, tarımın sulamaya bağımlı olmasının sebebidir; noktalı virgül ve virgül arasındaki boşluğa sonuç bildiren bir geçiş ifadesi gelir: consequently. 'however' ve 'in contrast' zıtlık kurar, burada zıtlık yoktur. 'whereas' iki cümleyi ortadan bağlar, noktalı virgülden sonra virgülle kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d2-a5',
          soru: 'It was ___ a convincing argument that even the most sceptical members of the committee accepted it.',
          secenekler: ['so', 'too', 'very', 'such', 'enough'],
          dogru: 3,
          aciklama:
            "Boşluktan sonra bir isim öbeği (a convincing argument) ve 'that' ile başlayan sonuç cümlesi var: such + a + sıfat + isim + that. 'so' ardından doğrudan sıfat ister (so convincing that). 'too' ve 'very' bu kalıpta kullanılmaz.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u5-d2-a6',
          ciftler: [
            ['hence', 'bu nedenle'],
            ['consequently', 'sonuç olarak'],
            ['irrigation', 'sulama'],
            ['convincing', 'ikna edici'],
            ['sceptical', 'şüpheci'],
            ['dense', 'yoğun'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u5-d2-a7',
          cumle: 'Many species are endangered due to the destruction of their habitats.',
          anlam: 'Pek çok tür, yaşam alanlarının tahrip edilmesi nedeniyle tehlike altında.',
          celdiriciler: ['because', 'destroying', 'so'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u5-d2-a8',
          kaynak: 'Sınavı geçmek için çok çalıştı.',
          cevaplar: [
            'She studied hard to pass the exam.',
            'He studied hard to pass the exam.',
            'She studied hard in order to pass the exam.',
            'He studied hard in order to pass the exam.',
            'She studied very hard to pass the exam.',
            'He studied very hard to pass the exam.',
            'She studied a lot to pass the exam.',
            'He studied a lot to pass the exam.',
            'She worked hard to pass the exam.',
            'He worked hard to pass the exam.',
            'She studied hard so as to pass the exam.',
            'She studied very hard in order to pass the exam.',
            'She studied very hard so as to pass the exam.',
            'She studied a lot in order to pass the exam.',
            'She studied a lot so as to pass the exam.',
            'She worked hard in order to pass the exam.',
            'She worked hard so as to pass the exam.',
            'She worked very hard to pass the exam.',
            'She worked very hard in order to pass the exam.',
            'She worked very hard so as to pass the exam.',
            'He studied hard so as to pass the exam.',
            'He studied very hard in order to pass the exam.',
            'He studied very hard so as to pass the exam.',
            'He studied a lot in order to pass the exam.',
            'He studied a lot so as to pass the exam.',
            'He worked hard in order to pass the exam.',
            'He worked hard so as to pass the exam.',
            'He worked very hard to pass the exam.',
            'He worked very hard in order to pass the exam.',
            'He worked very hard so as to pass the exam.',
          ],
          aciklama:
            "'-mek için' amaç bildirir: to V1 ya da in order to V1. 'çok çalışmak' için en doğal karşılık 'study hard'dır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u5-d2-a9',
          metin:
            'Honeybee populations have declined sharply in many parts of the world over the past twenty years. Scientists attribute this decline to several factors, including pesticides, disease and habitat loss. ___ bees pollinate a large proportion of the crops humans eat, their disappearance could pose a serious threat to global food security.',
          soru: 'Parçadaki boşluğa hangisi getirilmelidir?',
          secenekler: ['Although', 'Unless', 'Since', 'Whereas', 'Even if'],
          dogru: 2,
          aciklama:
            "Arıların ürünlerin büyük kısmını tozlaştırması, yok olmalarının gıda güvenliğini tehdit etmesinin sebebidir; burada 'since' 'çünkü' anlamındadır. 'Although' ve 'Whereas' zıtlık kurar, oysa iki yan aynı yönde. 'Unless' ve 'Even if' arıların tozlaşma yapıp yapmadığını belirsiz bir koşul gibi gösterir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d2-a10',
          soru: 'Several main roads were closed for repairs, ___ the heavy traffic in the city centre this week.',
          secenekler: ['because', 'hence', 'although', 'so that', 'whereas'],
          dogru: 1,
          aciklama:
            "Yolların kapanması bu haftaki yoğun trafiğin sebebidir; boşluktan sonra yalnızca bir isim öbeği (the heavy traffic) gelir. 'hence' (dolayısıyla) bir isimle birlikte sonuç bildirebilir. 'because', 'although', 'so that' ve 'whereas' ardından tam cümle ister.",
        },
      ],
    },
    {
      id: 'sinav-u5-d3',
      gorsel: '➕',
      baslik: 'Koşul, Ekleme ve Zaman Bağlaçları',
      not: `Bu derste koşul, ekleme ve zaman bağlaçlarını tamamlıyoruz.

- Koşul: **unless** (= if not), **provided / providing that, as long as, on condition that** ("-mesi şartıyla"), **in case** ("-e karşı, ihtimaline karşı"), **otherwise** ("aksi takdirde")
- Ekleme: **moreover, furthermore, in addition** (yeni cümle başında); **besides** + isim/V-ing; **not only … but also**
- Zaman: **once** ("-ince, -dikten sonra"), **as soon as, until, by the time, whenever**

Örnekler:
- **Unless** we act now, it will be too late. (Şimdi harekete geçmezsek çok geç olacak.)
- You can borrow the book **as long as** you return it on Friday. (cuma günü geri getirmen şartıyla kitabı ödünç alabilirsin.)
- Take a jacket **in case** it gets cold. (Hava soğur ihtimaline karşı bir ceket al.)
- The device is cheap. **Moreover**, it is easy to use. (Cihaz ucuz. Üstelik kullanımı kolay.)
- **Once** the form is approved, you will receive an email. (Form onaylanınca bir e-posta alacaksın.)

**Sınav taktiği:** Cloze testte boşluğun önündeki ve arkasındaki cümle arasındaki ilişkiyi tek kelimeyle adlandır: zıtlık, sonuç, ek bilgi, koşul ya da zaman. Sonra yalnızca o gruptaki şıklara bak; diğer grupları toptan ele.

**Sık yapılan hata:** unless ile olumsuz fiil kullanmak: "Unless you don't study" yanlış; unless zaten olumsuzluk taşır: "Unless you study, you will fail".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u5-d3-a1',
          soru: 'The disease can be treated successfully ___ it is diagnosed at an early stage.',
          secenekler: ['unless', 'provided that', 'in case', 'otherwise', 'whereas'],
          dogru: 1,
          aciklama:
            "Başarılı tedavi, erken teşhis şartına bağlıdır: provided that (-mesi şartıyla). 'unless' (= if not) anlamı tersine çevirir: erken teşhis edilmezse tedavi edilebilir. 'in case' bir önlem bildirir, şart değil.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d3-a2',
          soru: 'Patients should not stop taking the medicine ___ their doctor tells them to do so.',
          secenekler: ['unless', 'provided that', 'in case', 'as long as', 'so that'],
          dogru: 0,
          aciklama:
            "Anlam: doktor söylemedikçe ilacı bırakmamalılar; 'unless' (-medikçe, -mezse) bu olumsuz koşulu verir. 'provided that' ve 'as long as' anlamı tersine çevirir: doktor bırakmalarını söylediği sürece bırakmamalılar. 'in case' bir önlem bildirir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d3-a3',
          soru: 'Researchers should always keep a backup copy of their data ___ their computer breaks down.',
          secenekler: ['unless', 'so that', 'whereas', 'in case', 'otherwise'],
          dogru: 3,
          aciklama:
            "Yedek kopya, bilgisayarın bozulma ihtimaline karşı alınan bir önlemdir: in case. 'unless' anlamsız bir koşul kurar (bilgisayar bozulmadıkça yedek alın). 'so that' amaç bildirir; bilgisayarın bozulması bir amaç olamaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d3-a4',
          soru: 'The new material is light and cheap. ___, it is highly resistant to heat, which makes it ideal for the aerospace industry.',
          secenekler: ['Otherwise', 'Nevertheless', 'Moreover', 'Instead', 'In contrast'],
          dogru: 2,
          aciklama:
            "İki cümle de malzemenin olumlu özelliklerini sıralıyor (hafif, ucuz ve ısıya dayanıklı); aynı yönde ek bilgi 'Moreover' ile verilir. 'Nevertheless' ve 'In contrast' zıtlık kurar, burada zıtlık yoktur. 'Otherwise' (aksi takdirde) bir koşul bildirir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u5-d3-a5',
          soru: '___ the new system is installed, employees will finally be able to access their files from any location.',
          secenekler: ['Until', 'Unless', 'Whereas', 'Although', 'Once'],
          dogru: 4,
          aciklama:
            "Dosyalara her yerden erişim, sistemin kurulmasından sonra mümkün olacak: Once (-ince, -dikten sonra). 'Until' anlamı tersine çevirir: sistem kurulana kadar erişebilecekler; 'finally' (sonunda) ise erişimin ancak sistem kurulunca başlayacağını gösterir. 'Unless' de sistemin kurulmamasını koşul yapar.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u5-d3-a6',
          ciftler: [
            ['diagnose', 'teşhis etmek'],
            ['resistant', 'dayanıklı'],
            ['backup', 'yedek'],
            ['install', 'kurmak'],
            ['access', 'erişmek'],
            ['moreover', 'üstelik'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u5-d3-a7',
          cumle: 'Unless urgent action is taken, many coastal cities may disappear.',
          anlam: 'Acil önlem alınmazsa pek çok kıyı kenti yok olabilir.',
          celdiriciler: ['If', 'not', 'takes'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u5-d3-a8',
          kaynak: 'Hava güzel olduğu sürece dışarıda çalışabiliriz.',
          cevaplar: [
            'We can work outside as long as the weather is good.',
            'As long as the weather is good, we can work outside.',
            'We can work outside as long as the weather is nice.',
            'As long as the weather is nice, we can work outside.',
            'We can work outside as long as the weather is fine.',
            'We can work outdoors as long as the weather is good.',
            'We can work outdoors as long as the weather is nice.',
            'We can work outside provided that the weather is good.',
            'As long as the weather is fine, we can work outside.',
            'Provided that the weather is good, we can work outside.',
            'We can work outside provided that the weather is nice.',
            'Provided that the weather is nice, we can work outside.',
            'We can work outside provided that the weather is fine.',
            'Provided that the weather is fine, we can work outside.',
            'We can work outside providing that the weather is good.',
            'Providing that the weather is good, we can work outside.',
            'We can work outside providing that the weather is nice.',
            'Providing that the weather is nice, we can work outside.',
            'We can work outside providing that the weather is fine.',
            'Providing that the weather is fine, we can work outside.',
            'We can work outside so long as the weather is good.',
            'So long as the weather is good, we can work outside.',
            'We can work outside so long as the weather is nice.',
            'So long as the weather is nice, we can work outside.',
            'We can work outside so long as the weather is fine.',
            'So long as the weather is fine, we can work outside.',
            'As long as the weather is good, we can work outdoors.',
            'As long as the weather is nice, we can work outdoors.',
            'We can work outdoors as long as the weather is fine.',
            'As long as the weather is fine, we can work outdoors.',
            'We can work outdoors provided that the weather is good.',
            'Provided that the weather is good, we can work outdoors.',
            'We can work outdoors provided that the weather is nice.',
            'Provided that the weather is nice, we can work outdoors.',
            'We can work outdoors provided that the weather is fine.',
            'Provided that the weather is fine, we can work outdoors.',
            'We can work outdoors providing that the weather is good.',
            'Providing that the weather is good, we can work outdoors.',
            'We can work outdoors providing that the weather is nice.',
            'Providing that the weather is nice, we can work outdoors.',
            'We can work outdoors providing that the weather is fine.',
            'Providing that the weather is fine, we can work outdoors.',
            'We can work outdoors so long as the weather is good.',
            'So long as the weather is good, we can work outdoors.',
            'We can work outdoors so long as the weather is nice.',
            'So long as the weather is nice, we can work outdoors.',
            'We can work outdoors so long as the weather is fine.',
            'So long as the weather is fine, we can work outdoors.',
          ],
          aciklama:
            "'olduğu sürece' bir şart bildirir: as long as. Zaman ve koşul bağlaçlarından sonra present simple gelir: the weather is good.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u5-d3-a9',
          metin:
            'Many people believe that multitasking makes them more productive. ___, research suggests that switching between tasks actually reduces efficiency, as the brain needs time to refocus each time attention shifts.',
          soru: 'Parçadaki boşluğa hangisi getirilmelidir?',
          secenekler: ['Similarly', 'Moreover', 'However', 'Therefore', 'For example'],
          dogru: 2,
          aciklama:
            "Birinci cümle yaygın bir inancı (çoklu görev verimi artırır), ikinci cümle bunun tersini gösteren araştırmayı anlatıyor; zıtlık bildiren 'However' gerekir. 'Similarly' ve 'Moreover' aynı yönde bilgi ekler. 'Therefore' inancın araştırmayı doğurduğunu söyler, mantıksızdır.",
        },
        {
          tur: 'konus',
          id: 'sinav-u5-d3-a10',
          cumle: 'Moreover, the method is both cheaper and more efficient.',
          anlam: 'Üstelik yöntem hem daha ucuz hem de daha verimli.',
          ipucu:
            "'moreover' mor-OU-vır: vurgu ikinci hecede. 'efficient' i-Fİ-şınt: 'c' burada 'ş' gibi okunur.",
        },
      ],
    },
  ],
};

const U6: Unite = {
  id: 'sinav-u6',
  gorsel: '📚',
  seviye: 'C1',
  baslik: 'Akademik Kelime Bilgisi',
  ozet: "YDS ve YÖKDİL'de en sık çıkan akademik fiilleri, phrasal verb'leri, sıfat-zarfları ve edat kalıplarını bağlam içinde öğrenirsin.",
  dersler: [
    {
      id: 'sinav-u6-d1',
      gorsel: '🔬',
      baslik: 'Sık Çıkan Akademik Fiiller',
      not: `YDS ve YÖKDİL kelime sorularının büyük bölümü akademik fiillerden gelir. Bu fiilleri **olumlu/olumsuz yükü** ve **nesne alıp almadığıyla** birlikte öğren.

- **undermine:** zayıflatmak, baltalamak (olumsuz, nesne alır)
- **deteriorate:** kötüleşmek (olumsuz, nesne almaz)
- **exacerbate:** daha da kötüleştirmek (olumsuz, nesne alır)
- **alleviate:** hafifletmek (olumlu, nesne alır)
- **enhance:** geliştirmek, artırmak (olumlu)
- **impede / hinder:** engellemek, sekteye uğratmak
- **comprise:** -den oluşmak, kapsamak (of almaz)

Örnekler:
- Corruption **undermines** trust in institutions. (Yolsuzluk kurumlara duyulan güveni zayıflatır.)
- His health **deteriorated** rapidly. (Sağlığı hızla kötüleşti.)
- The drug **alleviates** pain. (İlaç ağrıyı hafifletir.)
- The committee **comprises** ten members. (Komite on üyeden oluşur.)

**Sınav taktiği:** Kelime sorusunda önce boşluğun etrafındaki olumlu ya da olumsuz havayı bul (corruption, poor, without maintenance → olumsuz fiil). Sonra dil bilgisini kontrol et: boşluktan sonra nesne yoksa deteriorate gibi nesnesiz fiiller, nesne varsa exacerbate / undermine gibi nesneli fiiller uyar.

**Sık yapılan hata:** "comprise of" demek. Doğruları: "comprises ten members", "consists of ten members", "is composed of ten members".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u6-d1-a1',
          soru: 'Corruption seriously ___ public trust in democratic institutions.',
          secenekler: ['enhances', 'undermines', 'alleviates', 'sustains', 'acquires'],
          dogru: 1,
          aciklama:
            "Yolsuzluk (corruption) olumsuz bir öznedir ve kamu güvenine zarar verir: undermines (zayıflatır). 'enhances' (artırır) ve 'sustains' (sürdürür) olumlu anlam taşır, cümlenin mantığıyla çelişir. 'alleviates' ancak bir sorunu ya da acıyı nesne alır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d1-a2',
          soru: 'Without regular maintenance, the condition of historic buildings tends to ___ rapidly.',
          secenekler: ['deteriorate', 'exacerbate', 'undermine', 'comprise', 'impede'],
          dogru: 0,
          aciklama:
            "'Without regular maintenance' olumsuz bir sonuç bekletir ve boşluktan sonra nesne yoktur; nesne almayan 'deteriorate' (kötüleşmek) uyar. 'exacerbate' ve 'undermine' da olumsuzdur ama nesne ister (exacerbate the problem). 'comprise' anlam olarak uymaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d1-a3',
          soru: 'The new painkiller is designed to ___ the symptoms of chronic back pain.',
          secenekler: ['undermine', 'exacerbate', 'alleviate', 'emerge', 'deteriorate'],
          dogru: 2,
          aciklama:
            "Ağrı kesicinin amacı belirtileri hafifletmektir: alleviate. 'exacerbate' belirtileri kötüleştirmek anlamına gelir, ilacın amacına ters düşer. 'emerge' ve 'deteriorate' nesne almaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d1-a4',
          soru: "Poor road infrastructure continues to ___ economic development in the region's remote villages.",
          secenekler: ['enhance', 'facilitate', 'acquire', 'impede', 'emerge'],
          dogru: 3,
          aciklama:
            "'Poor road infrastructure' (yetersiz yol altyapısı) olumsuz bir öznedir ve kalkınmayı engeller: impede. 'enhance' ve 'facilitate' (kolaylaştırmak) olumlu anlam taşır, cümlenin mantığına ters düşer. 'emerge' nesne almaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d1-a5',
          soru: 'The committee ___ twelve members, all of whom are experts in public health.',
          secenekler: ['consists', 'composes', 'includes of', 'is consisted', 'comprises'],
          dogru: 4,
          aciklama:
            "'comprise' edat almadan doğrudan nesne alır: comprises twelve members. 'consists' anlam olarak doğru ama 'of' ister (consists of). 'composes' etken çatıda 'oluşur' anlamı vermez (is composed of olmalı), 'includes of' ve 'is consisted' ise dil bilgisi olarak yanlıştır.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u6-d1-a6',
          ciftler: [
            ['undermine', 'baltalamak'],
            ['deteriorate', 'kötüleşmek'],
            ['alleviate', 'hafifletmek'],
            ['impede', 'engellemek'],
            ['enhance', 'geliştirmek'],
            ['comprise', '-den oluşmak'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u6-d1-a7',
          cumle: 'Rising sea levels could undermine the stability of coastal ecosystems.',
          anlam: 'Yükselen deniz seviyeleri kıyı ekosistemlerinin dengesini bozabilir.',
          celdiriciler: ['enhance', 'deteriorate', 'rise'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u6-d1-a8',
          kaynak: 'Hava kirliliği astım belirtilerini kötüleştirebilir.',
          cevaplar: [
            'Air pollution can exacerbate the symptoms of asthma.',
            'Air pollution can exacerbate asthma symptoms.',
            'Air pollution may exacerbate asthma symptoms.',
            'Air pollution may exacerbate the symptoms of asthma.',
            'Air pollution can worsen asthma symptoms.',
            'Air pollution can worsen the symptoms of asthma.',
            'Air pollution may worsen asthma symptoms.',
            'Air pollution may worsen the symptoms of asthma.',
            'Air pollution can aggravate asthma symptoms.',
            'Air pollution can make asthma symptoms worse.',
            'Air pollution may make asthma symptoms worse.',
            'Air pollution can aggravate the symptoms of asthma.',
            'Air pollution may aggravate asthma symptoms.',
            'Air pollution may aggravate the symptoms of asthma.',
            'Air pollution could exacerbate asthma symptoms.',
            'Air pollution could exacerbate the symptoms of asthma.',
            'Air pollution could worsen asthma symptoms.',
            'Air pollution could worsen the symptoms of asthma.',
            'Air pollution could aggravate asthma symptoms.',
            'Air pollution could aggravate the symptoms of asthma.',
            'Air pollution can make the symptoms of asthma worse.',
            'Air pollution may make the symptoms of asthma worse.',
            'Air pollution could make asthma symptoms worse.',
            'Air pollution could make the symptoms of asthma worse.',
          ],
          aciklama:
            "'kötüleştirmek' nesne alan bir fiildir: exacerbate ya da worsen. 'deteriorate' nesne almadığı için burada kullanılamaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u6-d1-a9',
          soru: 'Rapid urbanisation has exacerbated environmental problems such as air pollution and water shortages.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Hava kirliliği ve su kıtlığı gibi çevre sorunları, hızlı kentleşmenin başlıca nedenleridir.',
            'Hızlı kentleşmeye rağmen hava kirliliği ve su kıtlığı gibi çevre sorunları hafiflemiştir.',
            'Hızlı kentleşme, hava kirliliği ve su kıtlığı dışındaki çevre sorunlarını da ortaya çıkarmıştır.',
            'Hızlı kentleşme, hava kirliliği ve su kıtlığı gibi çevre sorunlarını ağırlaştırmıştır.',
            'Hava kirliliği ve su kıtlığı gibi çevre sorunları, kentleşmenin hızını yavaşlatmıştır.',
          ],
          dogru: 3,
          aciklama:
            "Özne 'Rapid urbanisation', yüklem 'has exacerbated' (ağırlaştırmıştır), nesne 'environmental problems such as …' (… gibi çevre sorunları). Sorunları kentleşmenin nedeni ya da kentleşmeyi yavaşlatan etken gibi gösteren çeviriler sebep-sonuç ilişkisini tersine çevirir. '… dışındaki çevre sorunlarını' çevirisi 'such as' (gibi) ifadesini yanlış aktarır.",
        },
        {
          tur: 'konus',
          id: 'sinav-u6-d1-a10',
          cumle: 'These factors may exacerbate the existing economic crisis.',
          anlam: 'Bu etkenler mevcut ekonomik krizi daha da ağırlaştırabilir.',
          ipucu:
            "'exacerbate' ig-ZA-sır-beyt: vurgu ikinci hecede. 'crisis' KRAY-sis. 'economic' i-kı-NO-mik: vurgu üçüncü hecede.",
        },
      ],
    },
    {
      id: 'sinav-u6-d2',
      gorsel: '🧲',
      baslik: "Phrasal Verb'ler ve Kalıplaşmış Fiiller",
      not: `Phrasal verb'ler ve kalıplaşmış fiiller akademik metinlerde sık geçer; edatı değişince anlam tamamen değişir.

- **account for:** açıklamak; (oran olarak) oluşturmak
- **give rise to / bring about / lead to:** yol açmak, neden olmak
- **stem from / result from:** -den kaynaklanmak
- **carry out:** yürütmek, gerçekleştirmek (deney, araştırma)
- **rule out:** olasılık dışı bırakmak
- **put forward:** (fikir, teori) öne sürmek
- **cope with:** başa çıkmak
- **set up:** kurmak

Örnekler:
- Women **account for** 40 per cent of the workforce. (Kadınlar iş gücünün yüzde 40'ını oluşturuyor.)
- The policy **gave rise to** protests. (Politika protestolara yol açtı.)
- Many problems **stem from** poverty. (Pek çok sorun yoksulluktan kaynaklanıyor.)
- Scientists **carried out** a survey. (Bilim insanları bir anket yürüttü.)

**Sınav taktiği:** "X ___ Y" yapısında hangisinin sebep, hangisinin sonuç olduğunu belirle. X sebep, Y sonuçsa give rise to / bring about / lead to / result in; X sonuç, Y sebepse stem from / result from seç.

**Sık yapılan hata:** result in ile result from'u karıştırmak. "Smoking results in disease" (sigara hastalığa yol açar) ama "Disease results from smoking" (hastalık sigaradan kaynaklanır).`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u6-d2-a1',
          soru: "Women ___ nearly half of the workforce in the country's textile industry.",
          secenekler: ['account for', 'give rise to', 'carry out', 'rule out', 'set up'],
          dogru: 0,
          aciklama:
            "'nearly half of the workforce' bir oran bildirir; bir bütünün belli bir kısmını oluşturmak 'account for' ile anlatılır. 'give rise to' yol açmak demektir; kadınlar iş gücüne yol açmaz. 'set up' kurmak, 'rule out' olasılık dışı bırakmak anlamına gelir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d2-a2',
          soru: 'The researchers ___ a series of experiments to test the effectiveness of the new fertiliser.',
          secenekler: ['brought about', 'carried out', 'pointed out', 'stemmed from', 'coped with'],
          dogru: 1,
          aciklama:
            "Deney, araştırma ve anket gibi isimlerle kullanılan kalıp 'carry out'tur (yürütmek, gerçekleştirmek). 'brought about' bir değişikliğe yol açmak anlamındadır, deney için kullanılmaz. 'pointed out' bir şeyi belirtmek demektir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d2-a3',
          soru: 'Many of the conflicts in the region ___ disputes over access to water.',
          secenekler: ['put forward', 'set up', 'stem from', 'carry out', 'call for'],
          dogru: 2,
          aciklama:
            "Su kaynaklarına erişim konusundaki anlaşmazlıklar çatışmaların sebebidir; sonuç özne konumundaysa 'stem from' (-den kaynaklanmak) gerekir. 'call for' (gerektirmek) ve 'put forward' (öne sürmek) anlamca uymaz. 'carry out' bir faaliyet yürütmeyi anlatır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d2-a4',
          soru: 'Police have not yet ___ the possibility that the fire was started deliberately.',
          secenekler: ['carried out', 'set up', 'accounted for', 'ruled out', 'coped with'],
          dogru: 3,
          aciklama:
            "'the possibility' ile kullanılan ve 'have not yet' ile anlamlı olan kalıp 'rule out the possibility'dir (olasılığı dışlamak): polis kundaklama olasılığını henüz dışlamadı. 'accounted for' bir şeyi açıklamak demektir, bir olasılığı nesne olarak almaz. 'carried out' ve 'set up' de bir olasılıkla kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d2-a5',
          soru: 'The sudden rise in food prices ___ widespread protests across the country.',
          secenekler: ['stemmed from', 'set up', 'coped with', 'ruled out', 'gave rise to'],
          dogru: 4,
          aciklama:
            "Fiyat artışı sebep, protestolar sonuçtur; sebep özne konumundaysa 'give rise to' (yol açmak) kullanılır. 'stemmed from' ilişkiyi tersine çevirir: fiyat artışı protestolardan kaynaklanmış olur. 'coped with' başa çıkmak anlamına gelir.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u6-d2-a6',
          ciftler: [
            ['account for', 'açıklamak, oluşturmak'],
            ['give rise to', 'yol açmak'],
            ['carry out', 'yürütmek'],
            ['rule out', 'olasılık dışı bırakmak'],
            ['stem from', 'kaynaklanmak'],
            ['cope with', 'başa çıkmak'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u6-d2-a7',
          cumle: 'The committee will carry out a detailed investigation into the accident.',
          anlam: 'Komite kaza hakkında ayrıntılı bir soruşturma yürütecek.',
          celdiriciler: ['on', 'make', 'carrying'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u6-d2-a8',
          kaynak: 'Hükümet yeni bir plan öne sürdü.',
          cevaplar: [
            'The government put forward a new plan.',
            'The government has put forward a new plan.',
            'The government proposed a new plan.',
            'The government has proposed a new plan.',
            'The government came up with a new plan.',
            'The government has come up with a new plan.',
            'The government suggested a new plan.',
            'The government has suggested a new plan.',
            'The government put forth a new plan.',
            'The government has put forth a new plan.',
          ],
          aciklama:
            "'öne sürmek' için akademik kalıp 'put forward'dır; 'propose' da aynı anlamı verir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u6-d2-a9',
          soru: 'The sharp decline in sales can be largely accounted for by the rise of online shopping.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The sharp decline in sales has caused online shopping to rise considerably.',
            'Online shopping has risen despite the sharp decline in sales.',
            'Sales have declined sharply, but this has nothing to do with online shopping.',
            'The rise of online shopping will probably bring about a sharp decline in sales.',
            'The rise of online shopping largely explains the sharp decline in sales.',
          ],
          dogru: 4,
          aciklama:
            "'be accounted for by' 'ile açıklanmak' demektir: satışlardaki düşüş büyük ölçüde çevrim içi alışverişin yükselişiyle açıklanabilir. 'has caused online shopping to rise' sebep ile sonucu yer değiştirir. 'will probably bring about' ilişkiyi doğru kurar ama zamanı geleceğe taşır; asıl cümlede düşüş zaten yaşanmıştır.",
        },
        {
          tur: 'konus',
          id: 'sinav-u6-d2-a10',
          cumle: 'Further research is needed to rule out other possible causes.',
          anlam: 'Diğer olası nedenleri dışlamak için daha fazla araştırma gerekiyor.',
          ipucu:
            "'further' FÖR-dhır: 'th' dil ucu dişler arasında. 'causes' KOO-zız. 'rule out' bağlanarak ruu-LAUT gibi söylenir.",
        },
      ],
    },
    {
      id: 'sinav-u6-d3',
      gorsel: '📐',
      baslik: 'Sıfat, Zarf ve Edat Kalıpları',
      not: `Akademik metinlerde bazı sıfat, zarf ve edat kalıpları bütün hâlinde ezberlenmelidir.

- **prone to / susceptible to:** -e yatkın, -e açık
- **consistent with:** ile tutarlı — **contrary to:** -in aksine
- **regardless of:** -e bakılmaksızın — **in terms of:** açısından
- **considerably / significantly:** önemli ölçüde — **slightly:** biraz
- **merely:** yalnızca — **approximately:** yaklaşık olarak
- **inevitable:** kaçınılmaz — **crucial:** hayati, çok önemli

Örnekler:
- Children are more **prone to** infections. (Çocuklar enfeksiyonlara daha yatkındır.)
- The results are **consistent with** earlier studies. (Sonuçlar önceki çalışmalarla tutarlı.)
- **Contrary to** expectations, sales rose. (Beklentilerin aksine satışlar arttı.)
- Prices rose **considerably** last year. (Geçen yıl fiyatlar önemli ölçüde arttı.)

**Sınav taktiği:** Zarf sorusunda cümledeki sayılara bak: "iki milyondan beş milyona" gibi büyük bir değişim considerably / dramatically ister; küçük bir değişim slightly. Edat sorusunda boşluktan sonraki edatı (to, with, of) kalıpla eşleştir: prone **to**, consistent **with**, regardless **of**.

**Sık yapılan hata:** "according with" ya da "regardless to" demek. Doğruları "according to" ve "regardless of".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u6-d3-a1',
          soru: 'Elderly people are particularly ___ to infections during the winter months.',
          secenekler: ['prone', 'immune', 'resistant', 'aware', 'capable'],
          dogru: 0,
          aciklama:
            "Yaşlıların kış aylarında enfeksiyonlara daha açık olduğu anlatılıyor: prone to (-e yatkın). 'immune' ve 'resistant' de 'to' alır ama tam ters anlam verir (bağışık, dirençli); 'particularly' ve kış ayları bağlamı savunmasızlığı vurgular. 'aware' 'of', 'capable' ise 'of' ister.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d3-a2',
          soru: 'The results of the second study are ___ with those of earlier research, which strengthens the original hypothesis.',
          secenekler: ['contrary', 'consistent', 'regardless', 'superior', 'responsible'],
          dogru: 1,
          aciklama:
            "Sonuçlar ilk hipotezi güçlendiriyorsa önceki araştırmalarla uyumludur: consistent with (ile tutarlı). 'contrary' anlamca zıt olur ve 'to' alır. 'superior' 'to', 'responsible' 'for', 'regardless' ise 'of' ister.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d3-a3',
          soru: '___ popular belief, bats are not blind; most species can see quite well.',
          secenekler: [
            'According to',
            'Consistent with',
            'Contrary to',
            'In terms of',
            'Regardless of',
          ],
          dogru: 2,
          aciklama:
            "Yaygın inanış yarasaların kör olduğudur; cümle bunun tersini söylüyor: Contrary to (-in aksine). 'According to' ve 'Consistent with' inanışla uyum bildirir, cümledeki bilgiyle çelişir. 'Regardless of' bakılmaksızın demektir ve anlamı bozar.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d3-a4',
          soru: 'The population of the city has grown ___ over the past decade, from two million to nearly five million.',
          secenekler: ['slightly', 'merely', 'hardly', 'considerably', 'rarely'],
          dogru: 3,
          aciklama:
            "İki milyondan yaklaşık beş milyona çıkmak büyük bir artıştır: considerably (önemli ölçüde). 'slightly' (biraz) rakamlarla çelişir. 'hardly' (neredeyse hiç) ve 'rarely' (nadiren) artışı inkâr eder.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u6-d3-a5',
          soru: 'The scholarship is available to all qualified students, ___ of their nationality.',
          secenekler: ['in terms', 'according', 'instead', 'because', 'regardless'],
          dogru: 4,
          aciklama:
            "Bursun tüm nitelikli öğrencilere açık olması, uyruğun önemsiz olduğunu gösterir: regardless of (-e bakılmaksızın). 'in terms of' (açısından) ve 'because of' (yüzünden) anlamı bozar. 'according' 'to' ister.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u6-d3-a6',
          ciftler: [
            ['prone to', '-e yatkın'],
            ['contrary to', '-in aksine'],
            ['regardless of', '-e bakılmaksızın'],
            ['consistent with', 'ile tutarlı'],
            ['inevitable', 'kaçınılmaz'],
            ['approximately', 'yaklaşık olarak'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u6-d3-a7',
          cumle: 'Contrary to expectations, the new policy reduced unemployment significantly.',
          anlam: 'Beklentilerin aksine yeni politika işsizliği önemli ölçüde azalttı.',
          celdiriciler: ['According', 'expected', 'significant'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u6-d3-a8',
          kaynak: 'Bu sonuçlar önceki çalışmalarla tutarlıdır.',
          cevaplar: [
            'These results are consistent with previous studies.',
            'These findings are consistent with previous studies.',
            'These results are consistent with earlier studies.',
            'These findings are consistent with earlier studies.',
            'These results are consistent with previous research.',
            'These findings are consistent with previous research.',
            'These results are in line with previous studies.',
            'These findings are in line with previous studies.',
            'These results are consistent with earlier research.',
            'These results are consistent with prior studies.',
            'These results are consistent with prior research.',
            'These results are in line with earlier studies.',
            'These results are in line with previous research.',
            'These results are in line with earlier research.',
            'These results are in line with prior studies.',
            'These results are in line with prior research.',
            'These findings are consistent with earlier research.',
            'These findings are consistent with prior studies.',
            'These findings are consistent with prior research.',
            'These findings are in line with earlier studies.',
            'These findings are in line with previous research.',
            'These findings are in line with earlier research.',
            'These findings are in line with prior studies.',
            'These findings are in line with prior research.',
          ],
          aciklama: "'ile tutarlı' kalıbı 'consistent with'tir; edat 'with' olmalıdır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u6-d3-a9',
          soru: 'Yaşlarına bakılmaksızın tüm katılımcılar aynı testi tamamlamak zorundaydı.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Depending on their age, the participants had to complete different tests.',
            'Only participants of a certain age were required to complete the same test.',
            'All participants had to complete the same test regardless of their age.',
            'All participants, despite being old, managed to complete the same test.',
            'Participants were allowed to choose a test according to their age.',
          ],
          dogru: 2,
          aciklama:
            "'bakılmaksızın' = regardless of, 'zorundaydı' = had to. 'Depending on their age' ve 'according to their age' seçenekleri testi yaşa bağlar, yani tam tersini söyler. 'despite being old, managed to' seçeneği 'zorundaydı' yerine 'başardı' (managed to) der ve katılımcıların yaşlı olduğunu ekler.",
        },
        {
          tur: 'konus',
          id: 'sinav-u6-d3-a10',
          cumle: 'The findings are consistent with the original hypothesis.',
          anlam: 'Bulgular ilk hipotezle tutarlı.',
          ipucu:
            "'consistent' kın-SİS-tınt: vurgu ikinci hecede. 'original' ı-Rİ-cı-nıl: vurgu ikinci hecede.",
        },
      ],
    },
  ],
};

const U7: Unite = {
  id: 'sinav-u7',
  gorsel: '📝',
  seviye: 'C1',
  baslik: 'Soru Tipleri ve Sınav Stratejisi',
  ozet: 'Cümle tamamlama, çeviri, yakın anlam, diyalog, paragraf tamamlama, anlamı bozan cümle ve okuma sorularını adım adım stratejiyle çözersin.',
  dersler: [
    {
      id: 'sinav-u7-d1',
      gorsel: '✍️',
      baslik: 'Cümle Tamamlama',
      not: `**Cümle tamamlama** sorularında verilen yarım cümleyi şıklardan biriyle tamamlarsın. Adım adım ilerle:

- **1. Zaman uyumu:** If + present → will; had V3 → would have V3; by the time + past → past perfect.
- **2. Bağlaç anlamı:** although → zıtlık; so … that → sonuç; unless → olumsuz koşul.
- **3. Gönderim:** şıktaki it / they / this, verilen yarımdaki doğru isme dönmeli.
- **4. Mantık:** kalan şıklardan anlamca en tutarlı olanı seç.

Örnek: "Although the method is cheap, ___" → zıtlık bekleriz: "it produces less reliable results" (Yöntem ucuz olmasına rağmen daha az güvenilir sonuç veriyor).

**Sınav taktiği:** Önce yalnızca dil bilgisiyle eleme yap; çoğu soruda iki ya da üç şık zaman uyumu ya da bağlaç yüzünden düşer. Sonra kalan şıkları anlamla karşılaştır. Konusu cümleyle aynı olan ama bağlacın istediği ilişkiyi kurmayan şık en güçlü çeldiricidir.

**Sık yapılan hata:** Yalnızca konusu benzeyen şıkkı seçmek. "Although the Internet has made information accessible" yarımına "more people have gained access to it" uymaz; çünkü although bir zıtlık ister, bu şık ise aynı yönde bilgi verir.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u7-d1-a1',
          soru: 'Although the Internet has made information more accessible than ever, ___.',
          secenekler: [
            'many people now prefer to read news online rather than in print',
            'it has also made it harder to distinguish reliable sources from unreliable ones',
            'it was invented by scientists working for the US military',
            'people can easily find what they are looking for',
            'more and more people have gained access to it in recent years',
          ],
          dogru: 1,
          aciklama:
            "'Although' bir zıtlık ister: bilgiye erişim kolaylaştı ama güvenilir kaynağı ayırt etmek zorlaştı. 'people can easily find what they are looking for' ve 'more and more people have gained access to it' aynı yönde bilgi verir, zıtlık kurmaz. İnternetin icadından söz eden seçenek ise konu dışıdır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u7-d1-a2',
          soru: 'If governments do not take urgent measures to reduce carbon emissions, ___.',
          secenekler: [
            'global temperatures would have risen by more than two degrees',
            'many countries had already signed international agreements',
            'renewable energy sources were becoming cheaper',
            'the effects of climate change will become increasingly severe',
            'the planet would be much cooler than it is today',
          ],
          dogru: 3,
          aciklama:
            "If cümlesi present simple (do not take) ile kurulmuş gerçek bir koşuldur (Type 1); ana cümle 'will + V1' ister. 'would have risen' Type 3, 'would be much cooler' Type 2 yapısıdır ve zaman uyumunu bozar. Geçmiş zamanlı seçenekler koşul cümlesine hiç bağlanmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u7-d1-a3',
          soru: '___, the researchers had to repeat the entire experiment.',
          secenekler: [
            'Since some of the samples had been contaminated',
            'Unless the equipment is properly calibrated',
            'As soon as they publish their findings',
            'Whereas the first experiment will be conducted next year',
            'So that the funding agency approves the project',
          ],
          dogru: 0,
          aciklama:
            "Ana cümle geçmiştedir (had to repeat) ve deneyin tekrarlanmasının bir sebebi bekleniyor: örneklerin daha önce kirlenmiş olması (had been contaminated). 'Unless … is' ve 'As soon as they publish' şimdiki/gelecek zamandır, geçmiş ana cümleyle uyuşmaz. 'So that' ile başlayan seçenek amaç bildirir ama zaman ve mantık uyumu yoktur.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u7-d1-a4',
          soru: "The museum's collection is so valuable that ___.",
          secenekler: [
            'it is visited by very few people each year',
            'many of its paintings are not worth very much',
            'its entrance fee is lower than that of other museums',
            'some of the items were donated by local families',
            'it has been insured for several million dollars',
          ],
          dogru: 4,
          aciklama:
            "'so valuable that' bir sonuç ister: koleksiyon çok değerli olduğu için milyonlarca dolara sigortalanmış. 'many of its paintings are not worth very much' değerli olma bilgisiyle çelişir. Ziyaretçi azlığı, ucuz giriş ücreti ve bağış bilgisi koleksiyonun değerli olmasının sonucu değildir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u7-d1-a5',
          soru: 'Many species of frogs have disappeared in recent decades, ___.',
          secenekler: [
            'whereas they had been extinct for centuries',
            'so that they could adapt to colder climates',
            'which scientists attribute mainly to a deadly fungal disease',
            'although their numbers were increasing rapidly',
            'unless they are protected by strict laws',
          ],
          dogru: 2,
          aciklama:
            "Virgülden sonra gelen 'which' bütün bir olayı (kurbağaların yok olmasını) niteler ve bilim insanlarının bunu neye bağladığını söyler; anlam ve yapı tutarlıdır. 'although their numbers were increasing rapidly' yok olma bilgisiyle çelişir. 'whereas they had been extinct for centuries' son on yıllarda yok olmalarıyla çelişir, 'unless' ise zaman uyumunu bozar.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u7-d1-a6',
          ciftler: [
            ['accessible', 'erişilebilir'],
            ['contaminate', 'kirletmek'],
            ['distinguish', 'ayırt etmek'],
            ['attribute to', '-e bağlamak'],
            ['insure', 'sigortalamak'],
            ['adapt', 'uyum sağlamak'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u7-d1-a7',
          cumle: 'Although the method is expensive, it produces highly reliable results.',
          anlam: 'Yöntem pahalı olmasına rağmen son derece güvenilir sonuçlar veriyor.',
          celdiriciler: ['Despite', 'cheap', 'produce'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u7-d1-a8',
          kaynak: 'Pahalı olmasına rağmen bu yöntem çok etkilidir.',
          cevaplar: [
            'Although it is expensive, this method is very effective.',
            'Although this method is expensive, it is very effective.',
            'Even though it is expensive, this method is very effective.',
            'Even though this method is expensive, it is very effective.',
            'Though it is expensive, this method is very effective.',
            'This method is very effective although it is expensive.',
            'This method is very effective even though it is expensive.',
            'Despite being expensive, this method is very effective.',
            'This method is very effective despite being expensive.',
            'Although it is expensive, this method is highly effective.',
            'Although this method is expensive, it is highly effective.',
            'Though this method is expensive, it is very effective.',
            'This method is very effective though it is expensive.',
            'Despite its high cost, this method is very effective.',
            'In spite of being expensive, this method is very effective.',
            'This method is very effective in spite of being expensive.',
            'In spite of its high cost, this method is very effective.',
            'This method is highly effective although it is expensive.',
            'Even though it is expensive, this method is highly effective.',
            'Even though this method is expensive, it is highly effective.',
            'This method is highly effective even though it is expensive.',
            'Though it is expensive, this method is highly effective.',
            'Though this method is expensive, it is highly effective.',
            'This method is highly effective though it is expensive.',
            'Despite being expensive, this method is highly effective.',
            'This method is highly effective despite being expensive.',
            'Despite its high cost, this method is highly effective.',
            'In spite of being expensive, this method is highly effective.',
            'This method is highly effective in spite of being expensive.',
            'In spite of its high cost, this method is highly effective.',
          ],
          aciklama:
            "'-masına rağmen' tam cümleyle although / even though, V-ing ile despite olarak çevrilir: 'Despite being expensive'.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u7-d1-a9',
          soru: '___, he would not have been able to complete his doctoral thesis.',
          secenekler: [
            'If his supervisor supports him constantly',
            "Had it not been for his supervisor's constant support",
            'As long as his supervisor supports him',
            'Even though his supervisor helped him a lot',
            'Because his supervisor is very experienced',
          ],
          dogru: 1,
          aciklama:
            "Ana cümle 'would not have been able' Type 3 yapısıdır; yan cümle geçmişe ait gerçek dışı bir koşul ister: 'Had it not been for …' (… olmasaydı). 'If his supervisor supports him' ve 'As long as …' gerçek koşuldur, zaman uyumu yoktur. 'Even though … helped' gerçek bir geçmiş olayı anlatır ve gerçek dışı ana cümleyle bağlanmaz.",
        },
        {
          tur: 'konus',
          id: 'sinav-u7-d1-a10',
          cumle: 'Some of the samples had been contaminated before the analysis.',
          anlam: 'Örneklerin bir kısmı analizden önce kirlenmişti.',
          ipucu:
            "'contaminated' kın-TA-mi-ney-tıd: vurgu ikinci hecede. 'analysis' ı-NA-lı-sis: vurgu ikinci hecede.",
        },
      ],
    },
    {
      id: 'sinav-u7-d2',
      gorsel: '🌐',
      baslik: 'Çeviri Soruları (İngilizce ↔ Türkçe)',
      not: `**Çeviri soruları** sınavda hem İngilizceden Türkçeye hem Türkçeden İngilizceye sorulur. Doğru şık, anlamı **eksiksiz ve fazlasız** aktaran şıktır; en güzel Türkçe olan değil.

Dört adımlı kontrol:
- **1. İskelet:** ana özne ve ana yüklem hangisi? Yan cümledeki isim ana özne gibi çevrilmiş mi?
- **2. Zaman ve kip:** has done / had done / will have done; must have / may / should farkları korunmuş mu?
- **3. Bağlaç:** although (-e rağmen), unless (-mezse), since (-den beri / -diği için)
- **4. Nicelik ve derece:** few (çok az) / a few (birkaç), most (çoğu), hardly any (neredeyse hiç), more than (-den fazla)

Kalıplar:
- **The more …, the more …:** ne kadar …, o kadar …
- **Not only … but also …:** yalnızca … değil, aynı zamanda …
- **However + sıfat / much …:** ne kadar … olursa olsun

**Sınav taktiği:** Önce zamanı ve özneyi uymayan şıkları ele; çoğu soruda bu iki kontrol üç şıkkı düşürür. Kalan iki şık arasında nicelik ve bağlaç kelimelerini tek tek karşılaştır.

**Sık yapılan hata:** few ile a few'u aynı sanmak. "Few studies" olumsuz bir vurgu taşır (çok az çalışma), "a few studies" ise nötrdür (birkaç çalışma).`,
      alistirmalar: [
        {
          tur: 'secmeli',
          id: 'sinav-u7-d2-a1',
          soru: "Few studies have examined the long-term effects of social media use on children's mental health.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?",
          secenekler: [
            'Sosyal medya kullanımının çocukların ruh sağlığı üzerindeki uzun vadeli etkilerini birkaç çalışma incelemiştir.',
            'Sosyal medya kullanımının çocukların ruh sağlığı üzerindeki uzun vadeli etkilerini inceleyen çalışma sayısı oldukça azdır.',
            'Çocukların ruh sağlığı üzerinde sosyal medya kullanımının uzun vadeli etkileri olduğunu birçok çalışma göstermiştir.',
            'Sosyal medya kullanımının çocukların ruh sağlığına uzun vadede zarar verdiği hiçbir çalışmada incelenmemiştir.',
            'Sosyal medyanın çocuklar tarafından uzun süre kullanılmasının ruh sağlığına etkileri bazı çalışmalarda ele alınmıştır.',
          ],
          dogru: 1,
          aciklama:
            "'Few' (a olmadan) 'çok az' anlamı ve olumsuz bir vurgu taşır: inceleyen çalışma sayısı oldukça azdır. 'birkaç çalışma incelemiştir' 'a few'un çevirisidir ve olumsuz vurguyu kaybeder. 'hiçbir çalışmada' çevirisi 'few'u 'no' gibi alır, 'long-term effects'i de 'uzun süre kullanım' diye çeviren seçenek anlamı kaydırır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d2-a2',
          soru: 'Bu ilaç ne kadar erken kullanılırsa tedavi o kadar başarılı olur.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'This drug should be used early so that the treatment can be successful.',
            'As this drug was used too early, the treatment was not successful.',
            'Unless this drug is used early, the treatment will not be successful.',
            'The earlier this drug is used, the more successful the treatment is.',
            'The treatment is successful only if this drug is used as early as possible.',
          ],
          dogru: 3,
          aciklama:
            "'ne kadar …, o kadar …' orantı bildirir ve 'The + karşılaştırma …, the + karşılaştırma …' kalıbıyla verilir. 'only if' ve 'Unless' ile kurulan seçenekler orantı değil zorunlu bir şart anlatır. 'so that' amaç bildirir, 'As … was used too early' ise anlamı tersine çevirir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d2-a3',
          soru: 'Not only does the new law protect consumers, but it also encourages fair competition among companies.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Yeni yasa tüketicileri korumuyor; bunun yerine şirketler arasında adil rekabeti teşvik ediyor.',
            'Şirketler arasındaki adil rekabet, yeni yasanın tüketicileri korumasını sağlıyor.',
            'Yeni yasa, tüketicileri korumak için şirketler arasındaki rekabeti sınırlandırıyor.',
            'Yeni yasa yalnızca tüketicileri koruyor, şirketler arasındaki rekabeti ise teşvik etmiyor.',
            'Yeni yasa tüketicileri korumakla kalmıyor, aynı zamanda şirketler arasında adil rekabeti de teşvik ediyor.',
          ],
          dogru: 4,
          aciklama:
            "'Not only … but also' iki bilgiyi birlikte verir: 'korumakla kalmıyor, aynı zamanda … de teşvik ediyor'. 'korumuyor; bunun yerine' seçeneği 'not only'yi olumsuzluk sanır. 'yalnızca tüketicileri koruyor' seçeneği ise ikinci bilgiyi inkâr eder.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d2-a4',
          soru: 'Araştırmacılar, kuraklığın bölgedeki tarım üretimini büyük ölçüde azalttığını tespit etti.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Researchers found that the drought had considerably reduced agricultural production in the region.',
            'Researchers have found ways to reduce the effects of drought on agricultural production in the region.',
            'According to researchers, agricultural production in the region could reduce the risk of drought.',
            'Researchers expect that the drought will reduce agricultural production in the region slightly.',
            'Agricultural production in the region has increased considerably despite the drought, researchers found.',
          ],
          dogru: 0,
          aciklama:
            "Ana yüklem 'tespit etti' (found), yan cümle 'kuraklığın … azalttığını' (the drought had reduced), derece 'büyük ölçüde' (considerably). 'expect … will reduce … slightly' hem zamanı hem dereceyi değiştirir. 'found ways to reduce the effects' ana fikri bambaşka bir şeye çevirir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d2-a5',
          soru: 'Hardly any of the participants were aware that the experiment was being recorded.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Katılımcıların çoğu deneyin kaydedildiğini güçlükle fark etti.',
            'Deneyin kaydedildiğini fark eden katılımcılar deneyden ayrıldı.',
            'Katılımcıların neredeyse hiçbiri deneyin kaydedildiğinin farkında değildi.',
            'Katılımcılar deneyin kaydedileceğinden kesinlikle habersizdi.',
            'Katılımcıların tamamı deneyin kaydedildiğini biliyordu.',
          ],
          dogru: 2,
          aciklama:
            "'Hardly any' 'neredeyse hiç' demektir: katılımcıların neredeyse hiçbiri farkında değildi. 'güçlükle fark etti' seçeneği 'hardly'yi 'zorlukla' diye yanlış anlar. 'kesinlikle habersizdi' derecesi aşırıdır ve 'kaydedileceğinden' diyerek zamanı da değiştirir.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u7-d2-a6',
          ciftler: [
            ['few', 'çok az'],
            ['a few', 'birkaç'],
            ['hardly any', 'neredeyse hiç'],
            ['examine', 'incelemek'],
            ['competition', 'rekabet'],
            ['consumer', 'tüketici'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u7-d2-a7',
          cumle:
            'The more carefully the data are analysed, the more reliable the conclusions become.',
          anlam: 'Veriler ne kadar dikkatli analiz edilirse sonuçlar o kadar güvenilir olur.',
          celdiriciler: ['most', 'less', 'analyse'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u7-d2-a8',
          kaynak: 'Çok az öğrenci soruyu doğru yanıtladı.',
          cevaplar: [
            'Few students answered the question correctly.',
            'Very few students answered the question correctly.',
            'Only a few students answered the question correctly.',
            'Few students answered the question right.',
            'Very few students answered the question right.',
            'Few students gave the correct answer to the question.',
            'Very few students gave the correct answer to the question.',
            'Few students got the question right.',
            'Very few students got the question right.',
            'Very few students gave the right answer to the question.',
            'Few students gave the right answer to the question.',
          ],
          aciklama:
            "'Çok az' olumsuz vurgu taşır: few ya da very few. 'A few students' (birkaç öğrenci) bu vurguyu kaybeder.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d2-a9',
          soru: 'Teknoloji ne kadar gelişirse gelişsin, insan faktörü her zaman önemli olacaktır.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'As technology develops, the human factor becomes less important.',
            'The human factor has always been important in the development of technology.',
            'Because technology is developing so quickly, the human factor will lose its importance.',
            'However much technology develops, the human factor will always be important.',
            'Technology will develop only if the human factor is considered important.',
          ],
          dogru: 3,
          aciklama:
            "'ne kadar … -se -sin' bir taviz bildirir ve 'However much …' kalıbıyla verilir; 'her zaman önemli olacaktır' = will always be important. 'becomes less important' ve 'will lose its importance' ana fikri tersine çevirir. 'has always been important in the development of technology' zamanı ve konuyu değiştirir.",
        },
        {
          tur: 'konus',
          id: 'sinav-u7-d2-a10',
          cumle: 'Not only is the method cheaper, but it is also faster.',
          anlam: 'Yöntem yalnızca daha ucuz değil, aynı zamanda daha hızlı.',
          ipucu:
            "Devrik yapıda 'is' vurgulanmaz; vurgu 'cheaper' ve 'faster' üzerindedir. 'method' ME-thıd: 'th' dil ucu dişler arasında.",
        },
      ],
    },
    {
      id: 'sinav-u7-d3',
      gorsel: '🪞',
      baslik: 'Yakın Anlam ve Diyalog Tamamlama',
      not: `**Yakın anlam (restatement)** sorularında verilen cümleye anlamca en yakın şıkkı seçersin. Şıklar genellikle aynı kelimeleri farklı bir anlamla kullanır; kelime benzerliğine değil anlama bak.

Kontrol listesi:
- **Zaman:** asıl cümle geçmişse şık da geçmiş olmalı.
- **Olumlu/olumsuz:** unless = if not; hardly = neredeyse hiç.
- **Kesinlik:** must (kesine yakın) ≠ may (olası); highly unlikely = büyük olasılıkla olmayacak.
- **Karşılaştırma:** not as … as = daha az; no sooner … than = -ir -mez.

Örnekler:
- The film was **not as good as** the book. = The book was **better than** the film. (Film kitap kadar iyi değildi.)
- **No sooner** had he arrived **than** it started to rain. = **As soon as** he arrived, it started to rain. (O gelir gelmez yağmur başladı.)

**Diyalog tamamlama:** Boşluğun hem önündeki hem arkasındaki konuşmayla uyumlu şıkkı seç. Arkadan gelen tepki ("I'm not so sure…", "That's a relief!", "Then I'll ask someone else") çoğu zaman cevabı ele verir.

**Sınav taktiği:** Asıl cümlenin ana fikrini kendi Türkçenle tek cümlede söyle, sonra şıklarda o anlamı ara. Asıl cümledeki kelimeleri en çok tekrar eden şık çoğu zaman tuzaktır.

**Sık yapılan hata:** Kesinlik derecesini gözden kaçırmak: "It may rain" ile "It will certainly rain" aynı anlama gelmez.`,
      alistirmalar: [
        {
          tur: 'secmeli',
          id: 'sinav-u7-d3-a1',
          soru: 'The new model is not as energy-efficient as the previous one.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The new model is far more energy-efficient than the previous one.',
            'The previous model is more energy-efficient than the new one.',
            'Both models are equally energy-efficient.',
            'The new model uses energy as efficiently as the previous one did.',
            'The new model was designed to save more energy than the previous one.',
          ],
          dogru: 1,
          aciklama:
            "'not as … as' eşitliği olumsuzlar: yeni model eskisi kadar verimli değil, yani eski model daha verimli. 'far more energy-efficient' anlamı tersine çevirir. 'equally' ve 'as efficiently as' seçenekleri olumsuzluğu atlayıp eşitlik bildirir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d3-a2',
          soru: 'No sooner had the results been announced than the protests began.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The protests began long before the results were announced.',
            'The results were announced because the protests had begun.',
            'As soon as the results were announced, the protests began.',
            'The protests ended as soon as the results were announced.',
            'The results were announced some time after the protests had ended.',
          ],
          dogru: 2,
          aciklama:
            "'No sooner … than' '-ir -mez' anlamı verir: sonuçlar açıklanır açıklanmaz protestolar başladı = As soon as. 'The protests ended as soon as …' doğru bağlacı kullanır ama 'başladı'yı 'bitti'ye çevirir. 'long before' olayların sırasını tersine çevirir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d3-a3',
          soru: 'Unless the company reduces its costs, it may go bankrupt within a year.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The company will certainly go bankrupt even if it reduces its costs.',
            'The company has reduced its costs, so it will not go bankrupt.',
            'If the company goes bankrupt, it will have to reduce its costs.',
            'The company reduced its costs a year ago, but it still went bankrupt.',
            'The company may go bankrupt within a year if it does not reduce its costs.',
          ],
          dogru: 4,
          aciklama:
            "'Unless' = if not; 'may' ise olasılık bildirir: maliyetlerini düşürmezse bir yıl içinde iflas edebilir. 'will certainly … even if' hem kesinlik derecesini hem koşulu değiştirir. 'If the company goes bankrupt, it will have to reduce' sebep ile sonucu yer değiştirir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d3-a4',
          metin:
            "Elif: I read that the university is planning to make the English preparatory year optional.\nTom: ___\nElif: I'm not so sure. Many students might skip it and then struggle in their lectures.",
          soru: 'Diyaloğu tamamlayan ifade hangisidir?',
          secenekler: [
            'Really? That sounds like good news for students who already speak English well.',
            "Yes, I've already finished my preparatory year.",
            'No, the university has never had a preparatory year.',
            'I agree; it should definitely remain compulsory for everyone.',
            'When did you start studying English?',
          ],
          dogru: 0,
          aciklama:
            "Elif'in 'I'm not so sure' cevabı Tom'un hazırlığın isteğe bağlı olmasını olumlu bulduğunu gösterir; Elif buna olası bir sakınca ile karşı çıkıyor. 'it should definitely remain compulsory' Elif'in görüşüyle aynıdır, 'I'm not so sure' tepkisine uymaz. Diğer seçenekler plan hakkında görüş bildirmez.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d3-a5',
          metin:
            "Professor: Your essay is well written, but your conclusion isn't supported by enough evidence.\nStudent: ___\nProfessor: You could add data from the two surveys we discussed in class.",
          soru: 'Diyaloğu tamamlayan ifade hangisidir?',
          secenekler: [
            'Thank you, I worked very hard on the introduction.',
            "I'm afraid I can't attend the class next week.",
            'When is the deadline for the final version?',
            'Could you suggest what kind of evidence I should include?',
            "I've already submitted it to the journal.",
          ],
          dogru: 3,
          aciklama:
            "Profesörün son cümlesi bir öneridir (You could add data …); bu, öğrencinin ne tür kanıt ekleyebileceğini sorduğunu gösterir. 'When is the deadline …?' sorusuna profesör bir tarih verirdi. Girişe teşekkür eden ve derse katılamayacağını söyleyen seçenekler öneriyle bağlantı kurmaz.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u7-d3-a6',
          ciftler: [
            ['equally', 'eşit derecede'],
            ['bankrupt', 'iflas etmiş'],
            ['optional', 'isteğe bağlı'],
            ['compulsory', 'zorunlu'],
            ['struggle', 'zorlanmak'],
            ['efficient', 'verimli'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u7-d3-a7',
          cumle: 'No sooner had the results been announced than the protests began.',
          anlam: 'Sonuçlar açıklanır açıklanmaz protestolar başladı.',
          celdiriciler: ['when', 'Hardly', 'begun'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u7-d3-a8',
          kaynak: 'Yeni model eskisi kadar pahalı değil.',
          cevaplar: [
            'The new model is not as expensive as the old one.',
            'The new model is not as expensive as the previous one.',
            'The new model is not as expensive as the old model.',
            'The new model is not so expensive as the old one.',
            'The new model is cheaper than the old one.',
            'The new model is less expensive than the old one.',
            'The new model is not as expensive as the previous model.',
            'The new model is not so expensive as the previous one.',
            'The new model is not so expensive as the old model.',
            'The new model is not so expensive as the previous model.',
            'The new model is cheaper than the previous one.',
            'The new model is cheaper than the old model.',
            'The new model is cheaper than the previous model.',
            'The new model is less expensive than the previous one.',
            'The new model is less expensive than the old model.',
            'The new model is less expensive than the previous model.',
          ],
          aciklama:
            "'… kadar … değil' eşitliğin olumsuzudur: not as + sıfat + as. Aynı anlam 'cheaper than' ya da 'less expensive than' ile de verilebilir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d3-a9',
          soru: 'It is highly unlikely that the project will be completed before the end of the year.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The project will almost certainly be finished before the end of the year.',
            'The project was completed earlier than expected.',
            'The project will probably not be completed before the end of the year.',
            'It is impossible to know when the project started.',
            'The end of the year is the deadline for starting the project.',
          ],
          dogru: 2,
          aciklama:
            "'highly unlikely' 'büyük olasılıkla olmayacak' demektir: proje muhtemelen yıl sonundan önce bitmeyecek. 'almost certainly be finished' anlamı tersine çevirir. 'was completed earlier than expected' zamanı geçmişe taşır ve tamamlandığını söyler.",
        },
        {
          tur: 'konus',
          id: 'sinav-u7-d3-a10',
          cumle: 'It is highly unlikely that the project will be completed on time.',
          anlam: 'Projenin zamanında tamamlanması pek olası değil.',
          ipucu: "'unlikely' an-LAYK-li: vurgu ikinci hecede. 'completed' kım-PLİİ-tıd.",
        },
      ],
    },
    {
      id: 'sinav-u7-d4',
      gorsel: '📖',
      baslik: 'Paragraf Tamamlama, Anlamı Bozan Cümle ve Okuma',
      not: `Bu son derste paragraf tabanlı üç soru tipini çalışıyoruz.

**Paragraf tamamlama:** Boşluğun önündeki ve arkasındaki cümleyle bağ kur. Boşluktan sonraki cümle "this, these, such, their" ile başlıyorsa, bu zamirin gönderdiği isim boşluktaki cümlede olmalı. Boşluk paragrafın başındaysa genel bir giriş cümlesi seç.

**Anlam bütünlüğünü bozan cümle:** Önce ilk cümleden konuyu ve **odağı** belirle (ör. konu "uyku", odak "uykunun belleğe etkisi"). Konu kelimesini içeren ama odağı başka yöne kaydıran cümle aradığın cümledir. "For this reason, however, therefore" ile başlayan cümleler bir önceki cümleye bağlıdır; bu bağı koparan cümleyi ara.

**Okuma:** Önce soruyu oku, sonra parçada anahtar kelimeyi tara.
- "According to the passage" → parçada açıkça yazanı seç; yorum ekleme.
- "It can be understood / inferred" → parçadan çıkan en az iddialı şıkkı seç.
- "the most effective, only, always" gibi aşırı kesin ifadeler çoğu zaman yanlıştır.

**Sınav taktiği:** Okuma şıklarında parçadaki kelimeleri birebir tekrar eden şık değil, aynı bilgiyi farklı kelimelerle (paraphrase) veren şık genellikle doğrudur.

**Sık yapılan hata:** Paragrafta geçen bir kelimeyi gördüğün için şıkkı ilgili sanmak. Anlamı bozan cümle de çoğu zaman paragrafın konu kelimesini içerir.`,
      alistirmalar: [
        {
          tur: 'secmeli',
          id: 'sinav-u7-d4-a1',
          metin:
            '(I) Sleep plays a crucial role in the consolidation of memory. (II) During deep sleep, the brain replays information acquired during the day and transfers it to long-term storage. (III) Studies show that students who sleep well after learning remember new material better than those who stay awake. (IV) Many students drink coffee to stay awake while studying for exams. (V) For this reason, experts advise against sacrificing sleep in order to study longer.',
          soru: 'Parçada anlam bütünlüğünü bozan cümle hangisidir?',
          secenekler: ['I', 'II', 'III', 'IV', 'V'],
          dogru: 3,
          aciklama:
            "Parçanın odağı uykunun belleği pekiştirmedeki rolüdür. IV numaralı cümle öğrencilerin kahve içme alışkanlığına geçerek odağı kaydırır. Ayrıca V numaralı cümledeki 'For this reason' III numaralı cümledeki araştırma sonucuna bağlanır; IV araya girince bu bağ kopar.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d4-a2',
          metin:
            '(I) The Silk Road was not a single route but a network of trade routes connecting China with the Mediterranean. (II) Along these routes, merchants exchanged goods such as silk, spices and precious metals. (III) Silk is produced by silkworms, which feed almost exclusively on mulberry leaves. (IV) However, the Silk Road also enabled the spread of ideas, religions and technologies. (V) Buddhism, for example, reached China from India largely through these trade networks.',
          soru: 'Parçada anlam bütünlüğünü bozan cümle hangisidir?',
          secenekler: ['I', 'II', 'III', 'IV', 'V'],
          dogru: 2,
          aciklama:
            "Parça İpek Yolu'nun bir ticaret ağı olarak mal ve fikir alışverişindeki rolünü anlatır. III numaralı cümle 'silk' kelimesini içerir ama ipeğin nasıl üretildiğine geçerek odağı kaydırır. IV numaralı cümledeki 'However … also' II numaralı cümledeki mal ticaretine bağlanır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d4-a3',
          metin:
            'Antibiotics are among the most important discoveries in the history of medicine. ___ Bacteria that survive a course of antibiotics can multiply and pass on their resistance, making future infections much harder to treat. Therefore, doctors are urged to prescribe these drugs only when they are truly necessary.',
          soru: 'Parçadaki boşluğa hangisi getirilmelidir?',
          secenekler: [
            'The first antibiotic, penicillin, was discovered by Alexander Fleming in 1928.',
            'However, their overuse has led to the emergence of resistant bacteria.',
            'Viruses, unlike bacteria, cannot be treated with antibiotics.',
            'Fortunately, antibiotics are now cheaper and more widely available than ever.',
            'In addition, regular exercise strengthens the immune system.',
          ],
          dogru: 1,
          aciklama:
            "Boşluktan sonraki cümle 'their resistance' (dirençleri) diyerek direnç kavramının daha önce geçtiğini varsayar; son cümle de aşırı kullanımı önlemeye yönelik bir sonuç çıkarır. Bu ikisini yalnızca aşırı kullanımın dirençli bakterilere yol açtığını söyleyen cümle bağlar. Penisilinin keşfi ya da antibiyotiklerin ucuzlaması direnç konusuna geçişi sağlamaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d4-a4',
          metin:
            'Urban heat islands are metropolitan areas that are significantly warmer than the surrounding countryside. The main cause is the replacement of natural land cover with materials such as concrete and asphalt, which absorb heat during the day and release it slowly at night. As a result, night-time temperatures in large cities can be several degrees higher than in nearby rural areas. This effect is not merely uncomfortable; it increases energy consumption for air conditioning and can worsen air quality. To reduce the problem, many cities are now planting trees, creating green roofs and using lighter-coloured paving materials that reflect rather than absorb sunlight.',
          soru: 'According to the passage, urban heat islands are mainly caused by ___.',
          secenekler: [
            'the large number of air conditioners used in cities',
            'the lack of rainfall in metropolitan areas',
            'the high level of air pollution in the countryside',
            'the excessive number of trees planted in city centres',
            'the replacement of natural surfaces with heat-absorbing materials',
          ],
          dogru: 4,
          aciklama:
            'Parçanın ikinci cümlesi ana nedeni açıkça verir: doğal yüzeylerin ısıyı emen beton ve asfaltla değiştirilmesi. Klimalar parçada nedenin değil sonucun parçası olarak geçer (enerji tüketimi artar). Ağaç dikmek ise sorunu azaltmanın bir yolu olarak anılır.',
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d4-a5',
          metin:
            'Urban heat islands are metropolitan areas that are significantly warmer than the surrounding countryside. The main cause is the replacement of natural land cover with materials such as concrete and asphalt, which absorb heat during the day and release it slowly at night. As a result, night-time temperatures in large cities can be several degrees higher than in nearby rural areas. This effect is not merely uncomfortable; it increases energy consumption for air conditioning and can worsen air quality. To reduce the problem, many cities are now planting trees, creating green roofs and using lighter-coloured paving materials that reflect rather than absorb sunlight.',
          soru: 'It can be understood from the passage that ___.',
          secenekler: [
            'rural areas are usually warmer than cities at night',
            'urban heat islands only cause discomfort and have no other effects',
            'lighter-coloured surfaces can help reduce temperatures in cities',
            'concrete releases heat more quickly than natural land cover',
            'green roofs are the most effective solution to the problem',
          ],
          dogru: 2,
          aciklama:
            "Son cümle açık renkli zeminlerin güneş ışığını emmek yerine yansıttığını ve sorunu azaltmak için kullanıldığını söyler; buradan kentteki sıcaklığı düşürmeye yardım ettikleri anlaşılır. 'only cause discomfort' parçadaki 'not merely uncomfortable' ifadesiyle çelişir. 'the most effective solution' parçada olmayan aşırı kesin bir iddiadır.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u7-d4-a6',
          ciftler: [
            ['consolidation', 'pekiştirme'],
            ['emergence', 'ortaya çıkış'],
            ['prescribe', 'reçete etmek'],
            ['absorb', 'emmek'],
            ['reflect', 'yansıtmak'],
            ['surrounding', 'çevredeki'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u7-d4-a7',
          cumle: 'Concrete and asphalt absorb heat during the day and release it slowly.',
          anlam: 'Beton ve asfalt gündüz ısıyı emer ve onu yavaş yavaş geri verir.',
          celdiriciler: ['reflect', 'quickly', 'absorbs'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u7-d4-a8',
          kaynak: 'Bu etki yalnızca rahatsız edici değil, aynı zamanda tehlikelidir.',
          cevaplar: [
            'This effect is not only uncomfortable but also dangerous.',
            'This effect is not just uncomfortable but also dangerous.',
            'This effect is not merely uncomfortable but also dangerous.',
            'This effect is not only disturbing but also dangerous.',
            'This effect is not only uncomfortable but dangerous as well.',
            'This effect is not only uncomfortable, but it is also dangerous.',
            'Not only is this effect uncomfortable, but it is also dangerous.',
            'This effect is not only disturbing, but it is also dangerous.',
            'This effect is not only disturbing but dangerous as well.',
            'This effect is not just uncomfortable, but it is also dangerous.',
            'This effect is not just uncomfortable but dangerous as well.',
            'This effect is not just disturbing but also dangerous.',
            'This effect is not just disturbing, but it is also dangerous.',
            'This effect is not just disturbing but dangerous as well.',
            'This effect is not merely uncomfortable, but it is also dangerous.',
            'This effect is not merely uncomfortable but dangerous as well.',
            'This effect is not merely disturbing but also dangerous.',
            'This effect is not merely disturbing, but it is also dangerous.',
            'This effect is not merely disturbing but dangerous as well.',
            'Not only is this effect uncomfortable but also dangerous.',
            'Not only is this effect disturbing, but it is also dangerous.',
            'Not only is this effect disturbing but also dangerous.',
          ],
          aciklama: "'yalnızca … değil, aynı zamanda …' kalıbı 'not only … but also' ile verilir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u7-d4-a9',
          metin:
            '___ In the past, most people lived in the same village for their entire lives and rarely travelled more than a few kilometres from home. Today, by contrast, millions of people move to other cities or countries for education and work. This increased mobility has transformed family structures and social relationships.',
          soru: 'Parçadaki boşluğa hangisi getirilmelidir?',
          secenekler: [
            'Human mobility has changed dramatically over the last two centuries.',
            'Many villages still lack basic services such as clean water and electricity.',
            'Air travel has become cheaper thanks to the rise of low-cost airlines.',
            'Family structures differ considerably from one culture to another.',
            'Most universities now offer scholarships to international students.',
          ],
          dogru: 0,
          aciklama:
            "Boşluk paragrafın başındadır ve genel bir giriş cümlesi ister; paragraf geçmiş ile bugün arasındaki hareketlilik farkını anlatır ve 'This increased mobility' ile biter. Bu yüzden insan hareketliliğinin değiştiğini söyleyen cümle konuyu tanıtır. Aile yapılarının kültürden kültüre değiştiğini söyleyen cümle son cümledeki bir kelimeyi tekrar eder ama paragrafın konusu değildir.",
        },
        {
          tur: 'konus',
          id: 'sinav-u7-d4-a10',
          cumle: 'The phenomenon is particularly evident in large metropolitan areas.',
          anlam: 'Bu olgu özellikle büyük metropol alanlarında belirgindir.',
          ipucu:
            "'phenomenon' fı-NO-mi-nın: vurgu ikinci hecede. 'particularly' pır-Tİ-kyı-lır-li. 'metropolitan' met-rı-PO-li-tın.",
        },
      ],
    },
  ],
};

export const SINAV: Parkur = {
  id: 'sinav',
  ad: 'Sınav İngilizcesi',
  aciklama:
    "YDS, e-YDS ve YÖKDİL'e yönelik; dil bilgisi, akademik kelime ve soru tiplerini sınavdaki gibi beş şıklı sorularla B1'den C1'e çalıştırır.",
  uniteler: [U1, U2, U3, U4, U5, U6, U7],
};
