import type { Unite } from './tipler';

/**
 * Ek üniteler (2026-11-06) — seviyesine göre ders yoluna yerleşir (`mufredat.ts`).
 * İsim öbeği (B1), edat kalıpları ve eşdizimler (B2), okuma becerisi (C1), deneme (C1).
 */

const U8: Unite = {
  id: 'sinav-u8',
  seviye: 'B1',
  baslik: 'İsim Öbeği: Tanımlık, Miktar ve Karşılaştırma',
  gorsel: '📦',
  ozet: 'Tanımlıkları (a/an/the), miktar belirleyicilerini (few, little, each, neither) ve karşılaştırma yapılarını sınav sorularıyla pekiştirirsin.',
  dersler: [
    {
      id: 'sinav-u8-d1',
      baslik: 'Tanımlıklar: a, an, the ve Tanımlıksız Kullanım',
      gorsel: '📰',
      not: `İngilizcede ismin önündeki tanımlık (article) anlamı değiştirir; sınavda çoğu zaman iki boşluklu sorularda karşına çıkar.

- **a / an:** tekil, sayılabilir ve ilk kez anılan ya da "herhangi bir" isim. Seçim harfe göre değil **sese** göre yapılır: an hour, an MRI scan; a university, a European country.
- **the:** konuşanın ve dinleyenin bildiği, tek olan ya da belirlenmiş isim: the sun, the internet, the population of Istanbul. Üstünlük derecesi ve sıra sayılarıyla da gelir: the most serious, the first.
- **the + sıfat:** bir grubu anlatır, fiil çoğuldur: the elderly (yaşlılar), the poor (yoksullar).
- **Tanımlıksız (—):** sayılamayan ya da çoğul isim **genel** anlamda: Poverty causes disease. Children need sleep.

Örnekler:
- It took **an** hour. (Bir saat sürdü.)
- She works at **a** university. (Bir üniversitede çalışıyor.)
- **The** elderly need more care. (Yaşlıların daha fazla bakıma ihtiyacı var.)
- **Education** is a right. (Eğitim bir haktır.)

**Sınav taktiği:** Boşluktan sonraki isme üç soru sor: Sayılabilir mi? Tekil mi? Genel mi, belirli mi? İsim "of" ile belirli bir şeye bağlanmışsa (the history of Rome) çoğu zaman, üstünlük derecesi varsa her zaman "the" gelir (ama: a member of the team, a cup of tea); soyut bir kavram genel anlamda kullanılıyorsa tanımlık gelmez.

**Sık yapılan hata:** Türkçedeki genel anlamı "the" ile vermek: "The life is short" yanlış, doğrusu "Life is short". Bir de "an university" demek: university "yu" sesiyle başladığı için "a university" olur.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u8-d1-a1',
          soru: 'It took the researchers almost ___ hour to calibrate the equipment before each trial.',
          secenekler: ['a', 'an', 'the', 'some', 'much'],
          dogru: 1,
          aciklama:
            "'hour' kelimesinin 'h' harfi okunmaz; kelime ünlü sesle başladığı için 'an hour' olur. En güçlü çeldirici 'a'dır: harfe bakıp seçilir ama kural sese göre işler. 'the hour' belirli bir saati anlatır ve 'almost' ile süre bildiren bu yapıya uymaz; 'some' ve 'much' tekil sayılabilir 'hour' ile kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d1-a2',
          soru: 'Malta is ___ small European country, but it has played ___ important role in Mediterranean history.',
          secenekler: ['a / an', 'an / an', 'a / a', 'the / the', '— / an'],
          dogru: 0,
          aciklama:
            "'small' ünsüzle başladığı için 'a small', 'important' ünlüyle başladığı için 'an important' olur. 'a / a' ikinci boşlukta sesi göz ardı eder. 'the / the' ülkeyi ve rolü önceden bilinen, tek bir şeymiş gibi sunar; burada ilk kez ve 'herhangi bir' anlamında anılıyorlar. 'an / an' ünsüzle başlayan 'small' önüne 'an' koyar. Tekil sayılabilir 'country' tanımlıksız kullanılamaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d1-a3',
          soru: '___ poverty remains one of ___ main causes of poor health worldwide.',
          secenekler: ['— / the', 'The / the', 'A / the', '— / a', 'The / a'],
          dogru: 0,
          aciklama:
            "'poverty' burada genel anlamda kullanılan soyut ve sayılamayan bir isimdir; tanımlık almaz. 'one of the + çoğul isim' kalıbında 'the' zorunludur. En güçlü çeldirici 'The / the'dır: Türkçedeki genel anlamı 'the' ile vermek tipik bir hatadır. 'a main causes' tekil tanımlıkla çoğul isim kurduğu için yanlıştır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d1-a4',
          soru: 'Governments should provide better health services for ___ elderly, who are more vulnerable to infections.',
          secenekler: ['the', 'an', 'a', '—', 'some'],
          dogru: 0,
          aciklama:
            "'the + sıfat' yapısı bir grubu anlatır: the elderly (yaşlılar), ve 'who are' çoğul fiili de bunu doğrular. Tanımlıksız kullanım en güçlü çeldiricidir ama 'elderly' bir sıfattır, 'the' olmadan grup ismi olamaz. 'an' ve 'a' tekil bir isim ister; cümlede isim yoktur.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d1-a5',
          soru: '___ population of Istanbul has more than doubled since the 1980s.',
          secenekler: ['The', 'A', '—', 'An', 'Each'],
          dogru: 0,
          aciklama:
            "'of Istanbul' ismi belirler: hangi nüfus olduğu bellidir, bu yüzden 'the' gelir. Tanımlıksız kullanım en güçlü çeldiricidir, ama 'population' burada genel bir kavram değil, belirli bir şehrin nüfusudur. 'A' ve 'An' bir şehrin tek nüfusunu 'herhangi biri' gibi sunar; 'Each' ise birden çok nüfus varmış gibi anlam verir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d1-a6',
          soru: 'Scientists have long debated whether life exists elsewhere in ___ universe.',
          secenekler: ['the', 'a', 'an', '—', 'one'],
          dogru: 0,
          aciklama:
            "Evren tek ve herkesçe bilinen bir şeydir (the sun, the internet gibi), bu yüzden 'the universe' denir. 'a universe' birçok evrenden herhangi birini anlatır ve cümlenin anlamına uymaz. 'universe' ünsüz 'yu' sesiyle başladığı için 'an' zaten yanlıştır; tanımlıksız kullanım da tekil sayılabilir isimle olmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d1-a7',
          soru: 'He applied for ___ job at ___ university near his hometown.',
          secenekler: ['a / a', 'an / an', 'a / an', 'an / a', 'the / an'],
          dogru: 0,
          aciklama:
            "'job' ünsüzle başlar: a job. 'university' harf olarak ünlüyle başlar ama 'yu' sesiyle okunur, bu yüzden 'a university' olur. En güçlü çeldirici 'a / an'dır: harfe bakıp 'an' seçilir. Diğer bütün seçenekler bu iki isimden en az birinin önüne 'an' koyduğu için yanlıştır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u8-d1-a8',
          soru: 'Yaşlılar genellikle gençlerden daha fazla sağlık hizmetine ihtiyaç duyar.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'The elderly generally need more health care than the young.',
            'The elderly generally need less health care than the young.',
            'Young people generally need more health care than the elderly.',
            'The elderly generally needed more health care when they were young.',
            'An elderly person rarely needs more health care than a young one.',
          ],
          dogru: 0,
          aciklama:
            "'Yaşlılar' ve 'gençler' grup anlatır: the elderly, the young. 'daha fazla' = more, 'genellikle' = generally. 'less' karşılaştırmayı tersine çevirir; gençleri öne alan seçenek kimin daha fazla ihtiyaç duyduğunu değiştirir. Geçmiş zamanlı seçenek anlamı yaşlıların gençliğine taşır; 'rarely' ise 'genellikle'nin tam tersidir.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u8-d1-a9',
          ciftler: [
            ['the elderly', 'yaşlılar'],
            ['the poor', 'yoksullar'],
            ['the unemployed', 'işsizler'],
            ['an hour', 'bir saat'],
            ['a university', 'bir üniversite'],
            ['the universe', 'evren'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u8-d1-a10',
          cumle: 'The elderly are more vulnerable to infections than the young.',
          anlam: 'Yaşlılar enfeksiyonlara gençlerden daha açıktır.',
          celdiriciler: ['an', 'elder', 'youth'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u8-d1-a11',
          kaynak: 'Eğitim yoksulluğu azaltmanın en etkili yoludur.',
          cevaplar: [
            'Education is the most effective way to reduce poverty.',
            'Education is the most effective way of reducing poverty.',
            'Education is the most effective way to decrease poverty.',
            'Education is the most effective way of decreasing poverty.',
            'Education is the most effective way to alleviate poverty.',
            'Education is the most effective way of alleviating poverty.',
            'Education is the most effective means of reducing poverty.',
            'Education is the most effective means to reduce poverty.',
            'Education is the most effective way to lower poverty.',
            'Education is the most effective way to lessen poverty.',
            'Education is the most effective way of lessening poverty.',
            'Education is the most effective way to combat poverty.',
            'Education is the most effective way of combating poverty.',
          ],
          aciklama:
            "Genel anlamdaki 'eğitim' ve 'yoksulluk' tanımlık almaz (Education, poverty); üstünlük derecesi ise 'the' ister: the most effective way.",
        },
        {
          tur: 'konus',
          id: 'sinav-u8-d1-a12',
          cumle: 'It took us an hour to find a useful source.',
          anlam: 'Yararlı bir kaynak bulmamız bir saat sürdü.',
          ipucu:
            "'an hour' bitişik okunur: ı-NAU-ı; 'h' hiç okunmaz. 'useful' YUUS-fıl: 'yu' sesiyle başladığı için önünde 'a' var.",
        },
      ],
    },
    {
      id: 'sinav-u8-d2',
      baslik: 'Miktar Belirleyiciler: few, little, each, both, neither',
      gorsel: '⚖️',
      not: `Miktar belirleyiciler (quantifiers) ismin sayılabilir olup olmadığına ve cümlenin olumlu ya da olumsuz havasına göre seçilir.

- **few / a few** (+ sayılabilir çoğul): few = çok az (olumsuz vurgu), a few = birkaç (yeterli, olumlu)
- **little / a little** (+ sayılamayan): little = çok az (olumsuz), a little = biraz (olumlu)
- **each / every** + tekil isim + tekil fiil; **each of** + the + çoğul isim + tekil fiil
- **both** (ikisi de, çoğul fiil), **either** (ikisinden biri), **neither** (ikisinden hiçbiri; fiil olumlu kalır)
- **both … and**, **either … or**, **neither … nor**: "either/neither" yapısında fiil, kendisine yakın özneye uyar.

Örnekler:
- **Few** students passed. (Çok az öğrenci geçti — hayal kırıklığı.)
- **A few** students passed. (Birkaç öğrenci geçti.)
- We have **a little** time left. (Biraz vaktimiz kaldı.)
- **Each of** the samples **was** tested. (Örneklerin her biri test edildi.)
- **Neither** method **works**. (İki yöntemden hiçbiri işe yaramıyor.)

**Sınav taktiği:** Önce boşluktan sonraki isme bak: sayılabilir çoğulsa few/a few, sayılamıyorsa little/a little. Sonra cümlenin havasını oku: "unfortunately, so … cancelled" olumsuzsa a'sız biçim, "still, so we can" olumluysa a'lı biçim. İki seçenekten söz ediliyorsa (the two candidates) both / either / neither ara.

**Sık yapılan hata:** "Each of the students have" demek: "each" tekil fiil ister, doğrusu "Each of the students has". Bir de "neither" ile kurulan cümleye ikinci bir olumsuzluk eklemek: "Neither of them didn't come" yanlış, doğrusu "Neither of them came".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u8-d2-a1',
          soru: 'Unfortunately, ___ students attended the seminar, so it had to be cancelled.',
          secenekler: ['few', 'a few', 'little', 'a little', 'much'],
          dogru: 0,
          aciklama:
            "'Unfortunately' ve 'so it had to be cancelled' sayının yetersiz olduğunu gösterir: few (çok az). En güçlü çeldirici 'a few'dur; o 'birkaç' anlamında nötr ya da olumlu bir vurgu taşır ve iptalle çelişir. 'little', 'a little' ve 'much' sayılamayan isimlerle kullanılır; 'students' sayılabilir çoğuldur.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d2-a2',
          soru: 'There is still ___ time before the deadline, so we can check the data once more.',
          secenekler: ['a little', 'little', 'a few', 'few', 'many'],
          dogru: 0,
          aciklama:
            "'time' burada sayılamaz; 'still' ve 'so we can check' zamanın yettiğini gösterir: a little (biraz). En güçlü çeldirici 'little'dır: 'çok az' anlamıyla verilerin bir kez daha kontrol edilebileceği sonucuyla çelişir. 'a few', 'few' ve 'many' sayılabilir çoğul isim ister.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d2-a3',
          soru: '___ of the two candidates was qualified for the post, so the committee reopened the application process.',
          secenekler: ['Neither', 'Both', 'Either', 'All', 'Each'],
          dogru: 0,
          aciklama:
            "Komite başvuruları yeniden açtıysa iki adaydan hiçbiri uygun değildir: Neither (ikisinden hiçbiri), tekil fiil 'was' ile. 'Each' ve 'Either' tekil fiille uyumludur ama adayların uygun olduğunu söyler, sonuçla çelişir. 'Both' çoğul fiil (were) ister; 'All' ise ikiden fazlası için kullanılır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d2-a4',
          soru: '___ participant was given a consent form to sign before the interview.',
          secenekler: ['Every', 'All', 'Both', 'Few', 'Many'],
          dogru: 0,
          aciklama:
            "Boşluktan sonra tekil isim (participant) ve tekil fiil (was) var: every + tekil isim. 'All', 'Few' ve 'Many' anlamca uyabilir ama çoğul isim ister (all participants). 'Both' de çoğul isimle ve iki kişi için kullanılır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d2-a5',
          soru: 'Each of the samples ___ carefully labelled before it was sent to the laboratory.',
          secenekler: ['was', 'were', 'have been', 'are', 'being'],
          dogru: 0,
          aciklama:
            "'Each of + çoğul isim' tekil fiil alır; 'before it was sent' hem tekilliği (it) hem geçmiş zamanı doğrular: was. En güçlü çeldirici 'were'dür: 'samples' çoğul olduğu için cazip gelir, ama özne 'each'tir. 'have been' ve 'are' hem çoğul hem de zaman uyumsuzdur; 'being' çekimli fiil değildir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d2-a6',
          soru: 'You can submit the assignment ___ by email or in person at the department office.',
          secenekler: ['either', 'neither', 'both', 'nor', 'each'],
          dogru: 0,
          aciklama:
            "'or' ile eşleşen yapı 'either … or'dur (ya … ya da). 'both' 'and' ile, 'neither' 'nor' ile eşleşir; ayrıca 'neither' iki yolu da yasaklayarak 'You can submit' ile çelişir. 'nor' tek başına bu yapıyı başlatamaz; 'each' de iki seçenek bağlamaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d2-a7',
          soru: 'Neither the director nor the researchers ___ aware of the error in the data.',
          secenekler: ['were', 'was', 'is', 'has been', 'being'],
          dogru: 0,
          aciklama:
            "'neither … nor' yapısında fiil kendisine yakın olan özneye uyar: 'the researchers' çoğul, dolayısıyla 'were'. En güçlü çeldirici 'was'tır: ilk özne 'the director' tekil olduğu için cazip gelir. 'is' ve 'has been' tekildir; 'being' çekimli fiil değildir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d2-a8',
          soru: 'Both the theory and its applications ___ in the second chapter of the book.',
          secenekler: ['are discussed', 'is discussed', 'discusses', 'discuss', 'has discussed'],
          dogru: 0,
          aciklama:
            "'Both … and' iki özneyi birleştirir ve çoğul fiil ister; kuram ve uygulamalar tartışılan şeyler olduğu için edilgen gerekir: are discussed. 'discuss' çoğuldur ama etkendir; kuram bir şeyi tartışmaz, tartışılır. 'is discussed', 'discusses' ve 'has discussed' tekildir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u8-d2-a9',
          soru: 'Few people realise how much water is needed to produce a single cotton shirt.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Tek bir pamuklu gömlek üretmek için ne kadar su gerektiğini çok az kişi fark eder.',
            'Tek bir pamuklu gömlek üretmek için ne kadar su gerektiğini birkaç kişi fark etmiştir.',
            'Pek çok kişi, tek bir pamuklu gömlek üretmek için çok su gerektiğini bilir.',
            'Tek bir pamuklu gömlek üretmek için az miktarda su gerektiğini çoğu kişi fark etmez.',
            'Bir gömlek üretmek için gereken su miktarını hiç kimse tam olarak bilmez.',
          ],
          dogru: 0,
          aciklama:
            "'Few people' olumsuz vurgulu 'çok az kişi'dir, 'realise' geniş zamandır. 'birkaç kişi fark etmiştir' 'a few' ve 'have realised' çevirisidir. 'Pek çok kişi bilir' anlamı tersine çevirir. 'az miktarda su' cümleyi bozar: 'how much water' gereken suyun ne kadar çok olduğunu vurgular. 'hiç kimse' ise 'few'u 'no one' gibi alır.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u8-d2-a10',
          ciftler: [
            ['few', 'çok az (sayılabilir)'],
            ['little', 'çok az (sayılamaz)'],
            ['a few', 'birkaç'],
            ['a little', 'biraz'],
            ['either', 'ikisinden biri'],
            ['neither', 'ikisinden hiçbiri'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u8-d2-a11',
          cumle: 'Neither of the two methods produced reliable results in the trial.',
          anlam: 'İki yöntemden hiçbiri denemede güvenilir sonuç vermedi.',
          celdiriciler: ['Either', 'both', 'produce'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u8-d2-a12',
          kaynak: 'Her katılımcıya bir anket verildi.',
          cevaplar: [
            'Every participant was given a questionnaire.',
            'Each participant was given a questionnaire.',
            'Every participant was given a survey.',
            'Each participant was given a survey.',
            'A questionnaire was given to every participant.',
            'A questionnaire was given to each participant.',
            'A survey was given to every participant.',
            'A survey was given to each participant.',
            'Each of the participants was given a questionnaire.',
            'Each of the participants was given a survey.',
            'All participants were given a questionnaire.',
            'All the participants were given a questionnaire.',
            'Every participant received a questionnaire.',
            'Each participant received a questionnaire.',
          ],
          aciklama:
            "'Her' tekil isimle 'every' ya da 'each' olur ve fiil tekil kalır: Every participant was given …",
        },
      ],
    },
    {
      id: 'sinav-u8-d3',
      baslik: 'Karşılaştırma: -er/more, the most, as … as, the more … the more',
      gorsel: '📈',
      not: `Karşılaştırma soruları sınavda boşluğun çevresindeki küçük ipuçlarıyla çözülür: than, as, the, of all.

- **Comparative:** kısa sıfat + -er (cheaper), uzun sıfat önüne more (more effective) + **than**
- **Superlative:** the + -est / the most + **in / of** (the highest in the world); one of the + superlative + **çoğul isim**
- **as + sıfat + as:** eşitlik; **not as/so … as:** -den daha az; **twice / three times as … as:** iki / üç kat
- **Pekiştirme:** much / far / considerably / a lot + comparative (very kullanılmaz)
- **The + comparative …, the + comparative:** ne kadar …, o kadar …
- Düzensizler: good – better – best, bad – worse – worst, far – further / farther – furthest / farthest

Örnekler:
- This test is **far easier than** the last one. (Bu sınav öncekinden çok daha kolay.)
- It is **one of the most important** studies. (En önemli çalışmalardan biridir.)
- The city is **twice as large as** it was. (Şehir eskisinin iki katı büyüklükte.)
- **The more** you practise, **the better** you get. (Ne kadar çok pratik yaparsan o kadar iyi olursun.)

**Sınav taktiği:** Boşluktan sonra "than" varsa comparative, "as" varsa as … as, "in the world / of all / ever" varsa superlative ara. Cümle "The more …" ile başlıyorsa ikinci yarı da "the + comparative" ile başlamalıdır.

**Sık yapılan hata:** "very more" ya da "more better" demek: doğrusu "much better". Bir de "one of the best student" kurmak: "one of the" yapısından sonra isim çoğul olur, "one of the best students".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u8-d3-a1',
          soru: 'The new vaccine proved to be considerably ___ than the previous one in clinical trials.',
          secenekler: [
            'more effective',
            'most effective',
            'as effective',
            'effective',
            'the most effective',
          ],
          dogru: 0,
          aciklama:
            "Boşluktan sonraki 'than' karşılaştırma ister; 'considerably' de yalnızca comparative'i pekiştirir: more effective. 'as effective' 'as … as' kalıbıyla kullanılır, 'than' ile değil. 'most effective' ve 'the most effective' üstünlük derecesidir; 'than' ile birlikte kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d3-a2',
          soru: 'The more carefully a study is designed, ___ its results are likely to be.',
          secenekler: [
            'the more reliable',
            'more reliable',
            'the most reliable',
            'most reliable',
            'as reliable',
          ],
          dogru: 0,
          aciklama:
            "'The more …' ile başlayan cümlenin ikinci yarısı da 'the + comparative' ile başlar: the more reliable (ne kadar dikkatli, o kadar güvenilir). En güçlü çeldirici 'more reliable'dır: 'the' olmadan kalıp tamamlanmaz. Üstünlük biçimleri ve 'as reliable' bu yapıya uymaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d3-a3',
          soru: 'Online courses are not ___ effective as face-to-face teaching for practical subjects such as surgery.',
          secenekler: ['as', 'more', 'such', 'the most', 'than'],
          dogru: 0,
          aciklama:
            "Sıfattan sonraki 'as' ipucudur: not as … as (… kadar … değil). 'more' ancak 'than' ile tamamlanır, 'as' ile değil. 'such' sıfattan önce 'as … as' kalıbını kurmaz; 'the most' ve 'than' da yapıya uymaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d3-a4',
          soru: 'Mount Everest is the highest mountain ___ the world, but it is not the most difficult to climb.',
          secenekler: ['in', 'than', 'from', 'by', 'as'],
          dogru: 0,
          aciklama:
            "Üstünlük derecesinde yer ve grup bildiren isimden önce 'in' gelir: the highest mountain in the world. 'than' yalnızca comparative ile, 'as' 'as … as' kalıbıyla kullanılır. 'from' ve 'by' bu kalıpta yer almaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d3-a5',
          soru: 'Air pollution is ___ worse in industrial cities than in rural areas.',
          secenekler: ['far', 'very', 'more', 'most', 'too'],
          dogru: 0,
          aciklama:
            "'worse' zaten comparative'dir (bad – worse – worst); onu 'far', 'much' ya da 'considerably' pekiştirir: far worse (çok daha kötü). En güçlü çeldirici 'very'dir: Türkçedeki 'çok' yüzünden seçilir, ama 'very' comparative ile kullanılmaz. 'more worse' çift karşılaştırmadır; 'most' ve 'too' da yapıya uymaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d3-a6',
          soru: 'This is one of the ___ studies ever conducted on the subject.',
          secenekler: [
            'most comprehensive',
            'more comprehensive',
            'comprehensive',
            'most comprehensively',
            'as comprehensive',
          ],
          dogru: 0,
          aciklama:
            "'one of the + superlative + çoğul isim' kalıbı ve 'ever' üstünlük derecesi ister: most comprehensive (en kapsamlı). 'more comprehensive' 'than' ister. 'most comprehensively' zarftır ve 'studies' ismini niteleyemez. Yalın 'comprehensive' ve 'as comprehensive' kalıbı tamamlamaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u8-d3-a7',
          soru: 'The population of the city is now twice ___ large as it was in the 1990s.',
          secenekler: ['as', 'so', 'more', 'than', 'much'],
          dogru: 0,
          aciklama:
            "Kat bildiren 'twice' 'as … as' kalıbıyla kullanılır: twice as large as (iki katı büyüklükte). 'so' bu kalıbı yalnızca olumsuz cümlede (not so … as) kurabilir. 'more' 'than' ister; 'than' ve 'much' de sıfattan önce 'as' ile eşleşmez.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u8-d3-a8',
          soru: 'The harder students work, the better their grades become.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            "Students' grades improve as they work harder.",
            'Students who get better grades work less hard than others.',
            'However hard students work, their grades do not change.',
            'Students work harder when their grades become worse.',
            "Students' grades are better than their effort.",
          ],
          dogru: 0,
          aciklama:
            "'The harder …, the better …' çalışma arttıkça notların yükseldiğini anlatır; 'as they work harder' (daha çok çalıştıkça) aynı orantıyı verir. 'However hard … do not change' ilişkiyi inkâr eder. Not düşüşünü ya da az çalışmayı anlatan seçenekler neden-sonuç ilişkisini tersine çevirir. Notları çabayla kıyaslayan seçenek ise cümlede olmayan bir karşılaştırma kurar.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u8-d3-a9',
          ciftler: [
            ['far better', 'çok daha iyi'],
            ['twice as large as', 'iki katı büyüklükte'],
            ['the most reliable', 'en güvenilir'],
            ['not as … as', '… kadar … değil'],
            ['the more, the better', 'ne kadar çok, o kadar iyi'],
            ['worse', 'daha kötü'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u8-d3-a10',
          cumle: 'The more we read, the more easily we understand complex texts.',
          anlam: 'Ne kadar çok okursak karmaşık metinleri o kadar kolay anlarız.',
          celdiriciler: ['most', 'easy', 'than'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u8-d3-a11',
          kaynak: 'Bu yöntem eskisinden çok daha ucuzdur.',
          cevaplar: [
            'This method is much cheaper than the old one.',
            'This method is far cheaper than the old one.',
            'This method is a lot cheaper than the old one.',
            'This method is considerably cheaper than the old one.',
            'This method is much cheaper than the previous one.',
            'This method is far cheaper than the previous one.',
            'This method is a lot cheaper than the previous one.',
            'This method is much cheaper than the old method.',
            'This method is far cheaper than the old method.',
            'This method is much cheaper than the earlier one.',
            'This method is considerably cheaper than the previous one.',
            'This method is significantly cheaper than the old one.',
            'This method is significantly cheaper than the previous one.',
            'This method is a lot cheaper than the old method.',
            'This method is far cheaper than the earlier one.',
            'This method is much cheaper than the previous method.',
            'This method is far cheaper than the previous method.',
          ],
          aciklama:
            "'çok daha' comparative'i pekiştirir: much / far / a lot cheaper. 'very cheaper' yanlıştır.",
        },
        {
          tur: 'konus',
          id: 'sinav-u8-d3-a12',
          cumle: 'The sooner we act, the better the results will be.',
          anlam: 'Ne kadar erken harekete geçersek sonuçlar o kadar iyi olur.',
          ipucu:
            "'the' ünsüzden önce zayıf okunur: dhı. 'sooner' SUU-nır, 'better' BE-tır; vurgu iki karşılaştırma kelimesinde.",
        },
      ],
    },
  ],
};

const U9: Unite = {
  id: 'sinav-u9',
  seviye: 'B2',
  baslik: 'Edat Kalıpları ve Akademik Eşdizimler',
  gorsel: '🔗',
  ozet: 'Fiil, sıfat ve isimlerle kalıplaşmış edatları ve akademik metinlerde birlikte kullanılan kelime öbeklerini (conduct research, pose a threat) öğrenirsin.',
  dersler: [
    {
      id: 'sinav-u9-d1',
      baslik: 'Fiil + Edat: depend on, consist of, contribute to',
      gorsel: '📎',
      not: `Bazı fiiller belirli bir edatla kalıplaşır; edatı Türkçeden çevirerek bulmaya çalışmak sınavda en sık yapılan hatadır.

- **depend on / rely on:** -e bağlı olmak / -e güvenmek, dayanmak
- **consist of:** -den oluşmak
- **contribute to:** -e katkıda bulunmak
- **benefit from:** -den yararlanmak
- **succeed in + V-ing:** -meyi başarmak
- **object to + V-ing:** -e itiraz etmek
- **comply with:** -e uymak (kural, yönetmelik)

Örnekler:
- The outcome **depends on** the weather. (Sonuç havaya bağlı.)
- The team **consists of** five experts. (Ekip beş uzmandan oluşuyor.)
- Stress **contributes to** heart disease. (Stres kalp hastalığına katkıda bulunur.)
- She **succeeded in** passing the exam. (Sınavı geçmeyi başardı.)

**Sınav taktiği:** Boşluktan sonra bir edat görürsen şıklarda o edatla kalıp kuran fiili ara; edat boşluktaysa fiili kalıbıyla hatırla. "to" bir edatsa (contribute to, object to) arkasından fiil **-ing** alır: object to building, contribute to reducing.

**Sık yapılan hata:** Türkçedeki "-e" hâlini "to" ile çevirip "depend to" ya da "-den" ekini "from" ile çevirip "consist from" demek. Bir de "succeed to do" kurmak: doğrusu "succeed in doing".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u9-d1-a1',
          soru: 'The success of the project will largely depend ___ the support of local communities.',
          secenekler: ['on', 'in', 'of', 'from', 'with'],
          dogru: 0,
          aciklama:
            "'depend' fiili 'on' ile kalıplaşır: depend on (-e bağlı olmak). 'from' Türkçedeki '-den' yüzünden, 'of' ise 'independent of' kalıbıyla karıştırılır; ikisi de yanlıştır. 'in' ve 'with' bu fiille kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d1-a2',
          soru: 'The committee ___ of twelve members, three of whom are external experts.',
          secenekler: ['consists', 'comprises', 'includes', 'contains', 'composes'],
          dogru: 0,
          aciklama:
            "Boşluktan sonraki 'of' ipucudur: consist of (-den oluşmak). En güçlü çeldirici 'comprises'tir: anlamı aynıdır ama edat almaz (The committee comprises twelve members). 'includes' ve 'contains' de 'of' almaz. 'composes' ise ancak edilgen biçimde 'is composed of' olarak bu anlamı verir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d1-a3',
          soru: 'Several factors have contributed ___ the rapid decline in the bee population.',
          secenekler: ['to', 'for', 'on', 'with', 'at'],
          dogru: 0,
          aciklama:
            "'contribute' 'to' ile kalıplaşır: contribute to (-e katkıda bulunmak, -e yol açmak). 'for' Türkçedeki 'için' çevirisiyle cazip gelir ama bu fiille kullanılmaz. 'on', 'with' ve 'at' de bu kalıpta yer almaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d1-a4',
          soru: 'Patients with chronic illnesses often benefit ___ regular, moderate exercise.',
          secenekler: ['from', 'to', 'of', 'with', 'on'],
          dogru: 0,
          aciklama:
            "'benefit' fiil olarak 'from' ile kalıplaşır: benefit from (-den yararlanmak). 'of' 'the benefits of exercise' gibi isim kalıbından gelen bir çağrışımdır; fiilden sonra kullanılmaz. 'to', 'with' ve 'on' de bu fiille uyuşmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d1-a5',
          soru: 'Despite several setbacks, the team finally succeeded ___ developing a low-cost water filter.',
          secenekler: ['in', 'on', 'to', 'at', 'for'],
          dogru: 0,
          aciklama:
            "'succeed' bir işi başarmak anlamında 'in + V-ing' alır: succeeded in developing. En güçlü çeldirici 'to'dur: 'succeed to' yalnızca bir makama ya da mirasa geçmek anlamında kullanılır ve -ing almaz. 'on', 'at' ve 'for' bu kalıpta yer almaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d1-a6',
          soru: 'Some residents strongly objected ___ the construction of a new motorway near the forest.',
          secenekler: ['to', 'for', 'on', 'with', 'at'],
          dogru: 0,
          aciklama:
            "'object' itiraz etmek anlamında 'to' ile kalıplaşır: object to (-e itiraz etmek). 'for', 'on', 'with' ve 'at' bu fiille kullanılmaz. Hatırla: buradaki 'to' bir edattır; arkasından fiil gelirse -ing alır (object to building).",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d1-a7',
          soru: 'All laboratories must comply ___ national safety regulations.',
          secenekler: ['with', 'to', 'by', 'for', 'at'],
          dogru: 0,
          aciklama:
            "'comply' kurala ya da yönetmeliğe uymak anlamında 'with' ile kalıplaşır. En güçlü çeldirici 'to'dur: Türkçedeki '-e uymak' yüzünden seçilir. 'by' ise 'abide by' kalıbından gelen bir karışıklıktır; 'comply by' kullanılmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u9-d1-a8',
          soru: 'Bölgenin ekonomisi büyük ölçüde turizme dayanıyor.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            "The region's economy relies heavily on tourism.",
            "The region's economy contributes greatly to tourism.",
            'Tourism in the region depends heavily on its economy.',
            "The region's economy has benefited slightly from tourism.",
            "The region's economy no longer depends on tourism.",
          ],
          dogru: 0,
          aciklama:
            "'-e dayanmak' = rely on, 'büyük ölçüde' = heavily. 'contributes to' yönü tersine çevirir: ekonomi turizme katkı yapar. 'Tourism … depends on its economy' kimin kime bağlı olduğunu değiştirir. 'slightly' büyük ölçüyü küçültür; 'no longer' ise ilişkiyi inkâr eder.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u9-d1-a9',
          ciftler: [
            ['rely on', '-e güvenmek, dayanmak'],
            ['consist of', '-den oluşmak'],
            ['contribute to', '-e katkıda bulunmak'],
            ['benefit from', '-den yararlanmak'],
            ['comply with', '-e uymak'],
            ['object to', '-e itiraz etmek'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u9-d1-a10',
          cumle: 'Many developing countries still rely heavily on agriculture and tourism.',
          anlam: 'Gelişmekte olan pek çok ülke hâlâ büyük ölçüde tarıma ve turizme dayanıyor.',
          celdiriciler: ['in', 'depend', 'relies'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u9-d1-a11',
          kaynak: 'Sonuç hava koşullarına bağlıdır.',
          cevaplar: [
            'The result depends on the weather conditions.',
            'The result depends on weather conditions.',
            'The outcome depends on the weather conditions.',
            'The outcome depends on weather conditions.',
            'The result is dependent on the weather conditions.',
            'The result is dependent on weather conditions.',
            'The outcome is dependent on the weather conditions.',
            'The outcome is dependent on weather conditions.',
            'The result depends on the weather.',
            'The outcome depends on the weather.',
            'The result depends upon the weather conditions.',
            'The outcome depends upon the weather conditions.',
          ],
          aciklama: "'-e bağlı olmak' = depend on; Türkçedeki '-e' ekine bakıp 'to' kullanma.",
        },
        {
          tur: 'konus',
          id: 'sinav-u9-d1-a12',
          cumle: 'The final grade depends on attendance and participation.',
          anlam: 'Final notu derse devama ve katılıma bağlıdır.',
          ipucu:
            "'depends on' bitişik okunur: di-PEN-zon. 'attendance' ı-TEN-dıns, 'participation' par-ti-si-PEY-şın.",
        },
      ],
    },
    {
      id: 'sinav-u9-d2',
      baslik: 'Sıfat + Edat: responsible for, aware of, similar to',
      gorsel: '🧲',
      not: `Sıfatlar da belirli edatlarla kalıplaşır. Sınavda ya sıfat ya da edat boşluğa bırakılır; diğerini ipucu olarak kullanırsın.

- **responsible for:** -den sorumlu
- **aware of:** -in farkında — **capable of:** -e muktedir, -ebilecek durumda
- **similar to:** -e benzer — **different from:** -den farklı
- **familiar with:** (bir şeyi) bilen, -e aşina — **familiar to:** (birine) tanıdık gelen
- **sensitive to:** -e duyarlı — **eligible for:** -e hak kazanmış, için uygun
- **involved in:** -e dâhil, -de yer alan

Örnekler:
- The council is **responsible for** waste collection. (Belediye çöp toplamadan sorumlu.)
- Few people are **aware of** the risk. (Riskin farkında olan çok az kişi var.)
- His results are **similar to** ours. (Onun sonuçları bizimkilere benzer.)
- I am **familiar with** this method. (Bu yöntemi biliyorum.)

**Sınav taktiği:** Edat boşluktaysa önce sıfatın kalıbını hatırla. Sıfat boşluktaysa boşluktan sonraki edat şıkların çoğunu eler: "___ for" görürsen responsible / eligible, "___ of" görürsen aware / capable, "___ to" görürsen similar / sensitive gibi sıfatlar kalır. Sonra anlamla tek şıkka in.

**Sık yapılan hata:** "similar with" demek: doğrusu "similar to". "different" için de sınavda en güvenli seçim "from"dur (different from). Bir de "capable to do" kurmak: doğrusu "capable of doing".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u9-d2-a1',
          soru: 'The Ministry of Health is responsible ___ monitoring the quality of drinking water.',
          secenekler: ['for', 'of', 'to', 'with', 'on'],
          dogru: 0,
          aciklama:
            "'responsible' bir işten sorumlu olmak anlamında 'for' ile kalıplaşır; arkasından fiil -ing alır: responsible for monitoring. 'of' Türkçedeki '-den' ekiyle cazip gelir ama yanlıştır. 'to' 'birine karşı sorumlu' anlamı verir ve -ing ile bu cümleye uymaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d2-a2',
          soru: 'Many consumers are not fully ___ of the environmental impact of fast fashion.',
          secenekler: ['aware', 'familiar', 'responsible', 'sensitive', 'dependent'],
          dogru: 0,
          aciklama:
            "Boşluktan sonraki 'of' ipucudur: aware of (-in farkında). En güçlü çeldirici 'familiar'dır: anlamca yakın ama 'with' ister. 'responsible' 'for', 'sensitive' 'to', 'dependent' ise 'on' ile kullanılır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d2-a3',
          soru: 'Only students with a grade average above seventy are ___ for the exchange programme.',
          secenekler: ['eligible', 'capable', 'aware', 'keen', 'fond'],
          dogru: 0,
          aciklama:
            "Belirli bir not ortalaması bir programa başvurma hakkı verir: eligible for (için uygun, hak sahibi). 'capable', 'aware' ve 'fond' 'of' ile, 'keen' ise 'on' ile kalıplaşır; hiçbiri 'for' almaz ve 'hak kazanmak' anlamını vermez.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d2-a4',
          soru: 'The symptoms of the new virus are very similar ___ those of seasonal flu.',
          secenekler: ['to', 'with', 'from', 'as', 'of'],
          dogru: 0,
          aciklama:
            "'similar' 'to' ile kalıplaşır: similar to (-e benzer). En güçlü çeldirici 'with'tir: Türkçedeki 'ile benzer' çevirisiyle seçilir ama akademik İngilizcede yanlıştır. 'from' 'different from' kalıbından gelir; 'as' 'the same as' kalıbına aittir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d2-a5',
          soru: 'Young children are particularly sensitive ___ changes in their daily routine.',
          secenekler: ['to', 'of', 'for', 'with', 'at'],
          dogru: 0,
          aciklama:
            "'sensitive' bir şeyden kolay etkilenmek anlamında 'to' ile kalıplaşır: sensitive to (-e duyarlı). 'of' ve 'for' Türkçedeki ek çevirilerinden gelen yanlış seçimlerdir. 'with' ve 'at' bu sıfatla kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d2-a6',
          soru: 'Most participants were already familiar ___ the software, so little training was needed.',
          secenekler: ['with', 'to', 'of', 'for', 'in'],
          dogru: 0,
          aciklama:
            "Kişi bir şeyi biliyorsa 'familiar with' kullanılır: katılımcılar yazılımı biliyordu. En güçlü çeldirici 'to'dur: 'familiar to' ise bir şeyin birine tanıdık gelmesidir (The software was familiar to them); burada özne kişi olduğu için yanlıştır. 'of', 'for' ve 'in' bu sıfatla kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d2-a7',
          soru: 'Researchers who were not directly involved ___ the study were asked to review the data.',
          secenekler: ['in', 'on', 'to', 'at', 'for'],
          dogru: 0,
          aciklama:
            "Bir çalışmada yer almak 'involved in' ile anlatılır. 'on' 'work on a study' kalıbından gelen bir çağrışımdır; 'involved on' kullanılmaz. 'to', 'at' ve 'for' da bu sıfatla kalıp kurmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d2-a8',
          soru: 'Human beings are capable ___ adapting to extremely different climates.',
          secenekler: ['of', 'to', 'for', 'in', 'at'],
          dogru: 0,
          aciklama:
            "'capable' 'of + V-ing' alır: capable of adapting (uyum sağlayabilecek durumda). En güçlü çeldirici 'to'dur: 'able to adapt' kalıbıyla karıştırılır, ama 'capable to' yanlıştır. 'for', 'in' ve 'at' de bu sıfatla kullanılmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u9-d2-a9',
          soru: 'Unlike earlier models, the new device is entirely independent of an external power source.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Önceki modellerin aksine, yeni cihaz harici bir güç kaynağından tamamen bağımsızdır.',
            'Önceki modeller gibi, yeni cihaz da harici bir güç kaynağına bağımlıdır.',
            'Yeni cihaz, önceki modellerden farklı olarak harici bir güç kaynağına tamamen bağlıdır.',
            'Önceki modellerin aksine, yeni cihaz harici bir güç kaynağına kısmen ihtiyaç duyar.',
            'Yeni cihaz, harici güç kaynağı sayesinde önceki modellerden daha bağımsızdır.',
          ],
          dogru: 0,
          aciklama:
            "'Unlike' = -in aksine, 'entirely independent of' = -den tamamen bağımsız. 'gibi' 'like' çevirisidir ve karşıtlığı yok eder. 'tamamen bağlıdır' ve 'kısmen ihtiyaç duyar' bağımsızlığı bağımlılığa çevirir. 'güç kaynağı sayesinde daha bağımsız' ise cümlede olmayan bir karşılaştırma kurar.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u9-d2-a10',
          ciftler: [
            ['responsible for', '-den sorumlu'],
            ['aware of', '-in farkında'],
            ['similar to', '-e benzer'],
            ['different from', '-den farklı'],
            ['involved in', '-e dâhil'],
            ['eligible for', 'için hak sahibi'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u9-d2-a11',
          cumle: 'Children are often more sensitive to noise than adults.',
          anlam: 'Çocuklar gürültüye genellikle yetişkinlerden daha duyarlıdır.',
          celdiriciler: ['of', 'sensible', 'adult'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u9-d2-a12',
          kaynak: 'Bu yazılıma aşina mısın?',
          cevaplar: [
            'Are you familiar with this software?',
            'Are you familiar with this program?',
            'Are you familiar with this programme?',
            'Are you acquainted with this software?',
          ],
          aciklama: "Kişi bir şeyi biliyorsa 'familiar with' kullanılır: Are you familiar with …?",
        },
      ],
    },
    {
      id: 'sinav-u9-d3',
      baslik: 'Akademik Eşdizimler: conduct research, pose a threat',
      gorsel: '🔬',
      not: `Eşdizim (collocation), anadili İngilizce olanların bir arada kullandığı kelime öbeğidir. Anlamca uygun bir fiil bile, kalıbın parçası değilse yanlıştır.

- **conduct / carry out research (a study):** araştırma (çalışma) yürütmek
- **pose a threat / a risk:** tehdit / risk oluşturmak
- **draw / reach a conclusion:** sonuç çıkarmak / bir sonuca varmak
- **reach a consensus / an agreement:** uzlaşmaya / anlaşmaya varmak
- **raise awareness:** farkındalık yaratmak — **raise a question:** bir soruyu gündeme getirmek
- **play a role:** rol oynamak — **take into account:** hesaba katmak
- **shed light on:** -e ışık tutmak

Örnekler:
- Smoking **poses a serious risk** to health. (Sigara sağlık için ciddi bir risk oluşturur.)
- We cannot **draw a conclusion** yet. (Henüz bir sonuç çıkaramayız.)
- The team **conducted a survey**. (Ekip bir anket yürüttü.)
- Diet **plays a key role** in health. (Beslenme sağlıkta kilit bir rol oynar.)

**Sınav taktiği:** Fiil boşluğa bırakılmışsa önce boşluktan sonraki ismi oku (threat, conclusion, awareness) ve o isimle kalıplaşan fiili ara. Şıklarda "make / do / give" gibi genel fiiller çoğu zaman çeldiricidir.

**Sık yapılan hata:** Türkçeden birebir çevirmek: "araştırma yapmak" için "make a research" yanlıştır, doğrusu "do / conduct research". "research" sayılamaz: "a research" değil, "a study" ya da "some research" denir. "sonuç çıkarmak" da "make a conclusion" değil, "draw a conclusion" olur.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u9-d3-a1',
          soru: 'Plastic waste in the oceans ___ a serious threat to marine life.',
          secenekler: ['poses', 'makes', 'does', 'takes', 'gives'],
          dogru: 0,
          aciklama:
            "'threat' ismi 'pose' fiiliyle kalıplaşır: pose a threat (tehdit oluşturmak). 'makes' Türkçedeki 'tehdit oluşturmak' çevirisiyle cazip gelir ama bu eşdizim yoktur. 'does', 'takes' ve 'gives' de 'threat' ile kalıp kurmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d3-a2',
          soru: 'Based on such a small sample, it would be unwise to ___ any firm conclusions.',
          secenekler: ['draw', 'raise', 'pose', 'take', 'hold'],
          dogru: 0,
          aciklama:
            "'conclusion' ismi 'draw' ile kalıplaşır: draw a conclusion (sonuç çıkarmak). 'raise' soru ya da endişeyle (raise a question), 'pose' tehdit ya da soruyla (pose a threat) kullanılır. 'take' ve 'hold' 'conclusion' ile eşdizim kurmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d3-a3',
          soru: 'After months of negotiations, the member states finally ___ a consensus on the new climate targets.',
          secenekler: ['reached', 'made', 'did', 'gave', 'set'],
          dogru: 0,
          aciklama:
            "Uzun müzakerelerin sonunda bir uzlaşmaya varılır: reach a consensus. 'made' Türkçedeki 'uzlaşma sağlamak' çevirisiyle seçilir ama 'make a consensus' standart bir eşdizim değildir. 'set' hedefle (set targets) kullanılır; 'did' ve 'gave' de uymaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d3-a4',
          soru: 'The campaign aims to ___ awareness of the early signs of diabetes.',
          secenekler: ['raise', 'rise', 'arise', 'pose', 'draw'],
          dogru: 0,
          aciklama:
            "'awareness' 'raise' ile kalıplaşır: raise awareness (farkındalık yaratmak). En güçlü çeldirici 'rise'dır: anlamı yakındır ama nesne almaz (Prices rise). 'arise' de nesnesizdir. 'draw' 'attention' ile (draw attention to), 'pose' ise 'threat' ile kullanılır.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d3-a5',
          soru: "Genetic factors ___ an important role in determining a person's risk of heart disease.",
          secenekler: ['play', 'make', 'do', 'take', 'give'],
          dogru: 0,
          aciklama:
            "'role' ismi 'play' ile kalıplaşır: play a role (rol oynamak). 'take' 'take part in' kalıbıyla karıştırılır ama 'take a role in determining' bu anlamı vermez. 'make', 'do' ve 'give' de 'role' ile eşdizim kurmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d3-a6',
          soru: 'When planning the budget, the council must ___ into account the needs of disabled residents.',
          secenekler: ['take', 'bring', 'put', 'make', 'give'],
          dogru: 0,
          aciklama:
            "'into account' 'take' ile kalıplaşır: take into account (hesaba katmak). 'put' 'put into practice' (uygulamaya koymak), 'bring' 'bring into force' gibi başka kalıplardan cazip gelir. 'make' ve 'give' bu öbekle kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d3-a7',
          soru: 'The new findings may ___ light on how the disease spreads between species.',
          secenekler: ['shed', 'pose', 'draw', 'raise', 'make'],
          dogru: 0,
          aciklama:
            "'light on' 'shed' ile kalıplaşır: shed light on (-e ışık tutmak, aydınlatmak). 'draw' 'draw attention to' kalıbıyla, 'raise' 'raise questions about' kalıbıyla karıştırılır; ikisi de 'light' ile kullanılmaz. 'pose' ve 'make' de bu kalıpta yer almaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d3-a8',
          soru: 'Researchers ___ a large-scale study involving more than ten thousand participants.',
          secenekler: ['conducted', 'raised', 'posed', 'drew', 'reached'],
          dogru: 0,
          aciklama:
            "Bir çalışma ya da araştırma 'conduct' ile yürütülür: conduct a study. 'reached' sonuç ya da uzlaşmayla (reach a conclusion), 'drew' sonuçla (draw a conclusion), 'raised' ve 'posed' soru ya da tehditle kullanılır; hiçbiri 'study' ile eşdizim kurmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u9-d3-a9',
          soru: "The study sheds light on the factors that pose the greatest risk to children's health.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?",
          secenekler: [
            'Çalışma, çocukların sağlığına en büyük riski oluşturan etkenlere ışık tutuyor.',
            'Çalışma, çocuk sağlığını tehdit eden risklerin nasıl azaltılabileceğini gösteriyor.',
            'Çalışma, çocukların sağlığı için en önemli etkenin risk almak olduğunu ortaya koyuyor.',
            'Çalışma, çocukların sağlığına yönelik risklerin abartıldığını öne sürüyor.',
            'Çalışma, çocukların sağlığını korumada en etkili etkenleri sıralıyor.',
          ],
          dogru: 0,
          aciklama:
            "'shed light on' = -e ışık tutmak, 'pose the greatest risk' = en büyük riski oluşturmak. Risklerin nasıl azaltılacağı, abartıldığı ya da koruyucu etkenler cümlede yoktur. 'risk almak' ise 'pose a risk' kalıbını 'take a risk' gibi yanlış okur.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u9-d3-a10',
          ciftler: [
            ['conduct research', 'araştırma yürütmek'],
            ['pose a threat', 'tehdit oluşturmak'],
            ['draw a conclusion', 'sonuç çıkarmak'],
            ['reach a consensus', 'uzlaşmaya varmak'],
            ['raise awareness', 'farkındalık yaratmak'],
            ['shed light on', '-e ışık tutmak'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u9-d3-a11',
          cumle: 'Climate change poses a serious threat to global food security.',
          anlam: 'İklim değişikliği küresel gıda güvenliği için ciddi bir tehdit oluşturuyor.',
          celdiriciler: ['makes', 'danger', 'secure'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u9-d3-a12',
          kaynak: 'Bu çalışmadan kesin bir sonuç çıkaramayız.',
          cevaplar: [
            'We cannot draw a definite conclusion from this study.',
            'We cannot draw a firm conclusion from this study.',
            'We cannot draw a clear conclusion from this study.',
            'We cannot draw a definitive conclusion from this study.',
            'We cannot reach a clear conclusion from this study.',
            'We cannot come to a definite conclusion from this study.',
            'We cannot come to a firm conclusion from this study.',
            'We cannot draw any definitive conclusions from this study.',
            'We cannot reach a definite conclusion from this study.',
            'We cannot reach a firm conclusion from this study.',
            'We cannot reach a definitive conclusion from this study.',
            'We cannot draw any firm conclusions from this study.',
            'We cannot draw any definite conclusions from this study.',
          ],
          aciklama:
            "'sonuç çıkarmak' = draw a conclusion; 'make a conclusion' standart bir eşdizim değildir.",
        },
      ],
    },
    {
      id: 'sinav-u9-d4',
      baslik: 'İsim + Edat: increase in, impact on, solution to',
      gorsel: '🎯',
      not: `İsimler de belirli edatlarla kalıplaşır; özellikle artış, etki ve neden bildiren isimler sınavda sık çıkar.

- **increase / decrease / rise / decline in** + neyin arttığı: an increase in prices (fiyatlarda artış)
- **increase of** + miktar: an increase of ten per cent (yüzde onluk artış)
- **effect / impact / influence on:** -e etki
- **solution to:** -e çözüm — **reason for:** -in nedeni — **cause of:** -in sebebi
- **demand for:** -e talep — **access to:** -e erişim
- **emphasis on:** -e vurgu — **attitude towards / to:** -e karşı tutum

Örnekler:
- There was a sharp **rise in** unemployment. (İşsizlikte keskin bir artış oldu.)
- Diet has an **effect on** mood. (Beslenmenin ruh hâline etkisi vardır.)
- There is no easy **solution to** this problem. (Bu sorunun kolay bir çözümü yok.)
- **Demand for** electric cars is growing. (Elektrikli otomobillere talep artıyor.)

**Sınav taktiği:** Boşluktaki edatı seçerken fiile değil, hemen önündeki **isme** bak. "increase" kelimesinden sonra neyin arttığı geliyorsa "in", artışın miktarı geliyorsa "of" seç. "the reason" ve "the cause" aynı anlamdadır ama farklı edat alır: reason **for**, cause **of**.

**Sık yapılan hata:** "an increase of the number of students" demek: neyin arttığı söyleniyorsa doğrusu "an increase in the number of students". Bir de "effect to" ve "reason of" kurmak: doğruları "effect on" ve "reason for".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u9-d4-a1',
          soru: 'There has been a sharp increase ___ the number of students applying for online degrees.',
          secenekler: ['in', 'of', 'on', 'at', 'for'],
          dogru: 0,
          aciklama:
            "Neyin arttığı (the number of students) söyleniyor: increase in. En güçlü çeldirici 'of'tur: 'increase of' yalnızca artışın miktarından önce gelir (an increase of twenty per cent). 'on', 'at' ve 'for' bu isimle kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d4-a2',
          soru: 'Social media has had a profound impact ___ the way young people communicate.',
          secenekler: ['on', 'to', 'in', 'of', 'for'],
          dogru: 0,
          aciklama:
            "'impact' bir şeyi etkilemek anlamında 'on' ile kalıplaşır: an impact on. 'to' Türkçedeki '-e etki' çevirisiyle cazip gelir ama yanlıştır. 'of' etkinin kaynağını gösterir (the impact of social media); etkilenen şeyden önce gelmez.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d4-a3',
          soru: 'Experts have not yet found a lasting solution ___ the problem of traffic congestion.',
          secenekler: ['to', 'on', 'at', 'with', 'by'],
          dogru: 0,
          aciklama:
            "'solution' çözülen sorundan önce 'to' alır: a solution to the problem. 'on' 'work on a problem' kalıbından, 'with' 'deal with a problem' kalıbından gelen çağrışımlardır; 'solution' ile kullanılmaz. 'at' ve 'by' de uymaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d4-a4',
          soru: 'Rising incomes have led to a growing demand ___ organic food.',
          secenekler: ['for', 'of', 'to', 'on', 'in'],
          dogru: 0,
          aciklama:
            "Bir ürüne duyulan talep 'demand for' ile anlatılır. 'of' 'talebin sahibini' gösterebilir (the demands of consumers) ama talep edilen şeyden önce gelmez. 'to', 'on' ve 'in' de bu isimle kalıp kurmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d4-a5',
          soru: 'Millions of people around the world still lack access ___ clean drinking water.',
          secenekler: ['to', 'for', 'of', 'on', 'in'],
          dogru: 0,
          aciklama:
            "'access' ulaşılan şeyden önce 'to' alır: access to clean water (temiz suya erişim). 'for' ve 'of' Türkçedeki 'için' ve tamlama çevirisinden gelen yanlış seçimlerdir. 'on' ve 'in' de bu isimle kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d4-a6',
          soru: 'The main reason ___ the delay was a shortage of qualified staff.',
          secenekler: ['for', 'of', 'to', 'on', 'at'],
          dogru: 0,
          aciklama:
            "'reason' 'for' ile kalıplaşır: the reason for the delay. En güçlü çeldirici 'of'tur: eş anlamlı 'cause' bu edatı alır (the cause of the delay), ama 'reason of' yanlıştır. 'to', 'on' ve 'at' de uymaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d4-a7',
          soru: 'The new curriculum places greater emphasis ___ critical thinking than on memorisation.',
          secenekler: ['on', 'to', 'in', 'for', 'at'],
          dogru: 0,
          aciklama:
            "'emphasis' 'on' ile kalıplaşır: place emphasis on; cümlenin sonundaki 'than on memorisation' da aynı edatı tekrarlayarak ipucu verir. 'to' Türkçedeki '-e vurgu' çevirisiyle cazip gelir ama yanlıştır. 'in', 'for' ve 'at' de bu isimle kullanılmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u9-d4-a8',
          soru: "Teachers' attitudes ___ technology have changed considerably since the pandemic.",
          secenekler: ['towards', 'in', 'for', 'at', 'with'],
          dogru: 0,
          aciklama:
            "Bir şeye karşı tutum 'attitude towards' (ya da 'to') ile anlatılır. 'for' ve 'with' Türkçe çağrışımlarla seçilir ama bu isimle kalıp kurmaz. 'in' ve 'at' de 'attitude' ile kullanılmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u9-d4-a9',
          soru: 'Kaliteli eğitime erişim eksikliği, yoksulluğun başlıca nedenlerinden biridir.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Lack of access to quality education is one of the main causes of poverty.',
            'Poverty is the main reason why quality education is lacking.',
            'Access to quality education has been the only solution to poverty.',
            'Quality education is one of the main effects of reducing poverty.',
            'The lack of quality education is caused mainly by poverty.',
          ],
          dogru: 0,
          aciklama:
            "'erişim eksikliği' = lack of access to, 'başlıca nedenlerinden biri' = one of the main causes of. Yoksulluğu neden yapan seçenekler (Poverty is the main reason, caused mainly by poverty) neden-sonuç ilişkisini tersine çevirir. 'the only solution' cümlede olmayan aşırı bir iddiadır; 'effects of reducing poverty' de anlamı bozar.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u9-d4-a10',
          ciftler: [
            ['an increase in', '-de artış'],
            ['an impact on', '-e etki'],
            ['a solution to', '-e çözüm'],
            ['access to', '-e erişim'],
            ['the reason for', '-in nedeni'],
            ['demand for', '-e talep'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u9-d4-a11',
          cumle: 'The government placed greater emphasis on preventive health care.',
          anlam: 'Hükümet koruyucu sağlık hizmetlerine daha fazla önem verdi.',
          celdiriciler: ['to', 'emphasise', 'prevention'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u9-d4-a12',
          kaynak: 'Bu ilacın kalp üzerinde bir etkisi var mı?',
          cevaplar: [
            'Does this drug have an effect on the heart?',
            'Does this medicine have an effect on the heart?',
            'Does this medication have an effect on the heart?',
            'Does this drug have any effect on the heart?',
            'Does this medicine have any effect on the heart?',
            'Does this medication have any effect on the heart?',
            'Does this drug have an impact on the heart?',
            'Does this medicine have an impact on the heart?',
            'Does this medication have an impact on the heart?',
            'Does this drug affect the heart?',
            'Does this medicine affect the heart?',
            'Does this medication affect the heart?',
          ],
          aciklama: "'-e etki' = an effect on; fiil olarak 'affect' kullanılırsa edat gerekmez.",
        },
      ],
    },
  ],
};

const PARCA_PLASEBO =
  "For decades, the placebo effect was regarded as little more than a nuisance in medical research: an improvement that had to be subtracted from a drug's results before its true value could be measured. Recent studies, however, suggest that the phenomenon deserves attention in its own right. When patients believe they are receiving an effective treatment, their brains can release natural painkillers known as endorphins, and the symptoms they report often decrease noticeably. Surprisingly, some experiments have found that placebos can work even when patients are told openly that the pills contain no active ingredient. Researchers suspect that the ritual of treatment itself, including a caring conversation with a doctor, may trigger the body's own healing mechanisms. Nevertheless, placebos are not a cure-all. They appear to influence how patients experience symptoms such as pain and fatigue, but they cannot shrink tumours or kill bacteria. For this reason, many experts argue that the placebo effect should be used to complement, not replace, conventional medicine.";

const PARCA_DIKEY_TARIM =
  'Vertical farming, the practice of growing crops in stacked layers inside buildings, is often presented as the future of agriculture. Because plants are grown under carefully controlled conditions, they need far less water than in open fields, and pesticides are rarely necessary. Crops can also be produced close to the cities where they are consumed, which reduces transport costs. Growing crops indoors also means that production is largely unaffected by droughts, floods and the changing seasons. Yet the technology has a major drawback: because sunlight is replaced by artificial lighting, vertical farms consume enormous amounts of electricity. As a result, they are currently viable mainly for a few high-value crops such as lettuce and herbs, while staple foods like wheat and rice remain far too expensive to grow indoors.';

const PARCA_DILLER =
  'Of the roughly seven thousand languages spoken today, linguists estimate that as many as half could disappear by the end of this century. Many of these endangered languages have only a few hundred speakers, and these speakers are often elderly. When children stop learning a language at home, usually because another language offers better economic opportunities, its decline becomes very difficult to reverse. The loss is not merely symbolic. Each language encodes a unique body of knowledge, including names for local plants, ways of describing the landscape and oral histories that have never been written down. When the last fluent speakers die, much of this knowledge vanishes with them. Some communities have responded by opening language nests, pre-school programmes in which young children are surrounded by the language from an early age. In New Zealand, such programmes are widely credited with helping to revive Māori, which had been in steep decline for much of the twentieth century.';

const PARCA_GECE_VARDIYASI =
  "Night work is now common in sectors such as healthcare, transport and manufacturing. People who work night shifts are more likely than day workers to develop a range of health problems, from digestive disorders to heart disease. For a long time, these problems were blamed on the lack of sleep that night workers typically experience. However, recent laboratory studies indicate that sleep loss alone cannot explain the pattern. When volunteers were kept awake at night but allowed to sleep for a normal length of time during the day, their blood sugar and hormone levels still became disrupted. The researchers concluded that the timing of activity matters: eating and working when the body's internal clock expects rest appears to place a strain on many organs.";

const PARCA_GSYH =
  "Gross domestic product, or GDP, is still treated by most governments as the ultimate measure of national success. Yet this faith in a single figure is, at best, misplaced. GDP rises when a country spends more on cleaning up after an oil spill or treating the victims of air pollution, but it ignores unpaid work such as caring for children and elderly relatives. It also tells us nothing about how income is distributed, so a nation can grow richer on paper while most of its citizens see no improvement at all. Admittedly, GDP has its uses: it is relatively easy to calculate and allows quick comparisons between economies. But to steer policy by this number alone is rather like judging a person's health solely by their weight. Several countries have begun to experiment with broader indicators that include education, life expectancy and environmental quality, and it is high time others followed their example.";

const PARCA_KUNDUZ =
  'In several European countries, beavers are being reintroduced to rivers from which they disappeared centuries ago. The results so far are encouraging. By building dams, beavers create ponds and wetlands that store water during dry periods and slow the flow of water after heavy rain, which can reduce flooding downstream. These wetlands also provide habitats for fish, insects and birds, and they can trap sediment that would otherwise pollute rivers further downstream. Not everyone is pleased, however. Some farmers complain that beaver dams flood their fields, and their concerns should not be dismissed. Rather than abandoning reintroduction, though, authorities would do well to work with landowners, for example by compensating them for their losses. Handled carefully, the return of the beaver could benefit both nature and people.';

const U10: Unite = {
  id: 'sinav-u10',
  seviye: 'C1',
  baslik: 'Okuma Becerisi',
  gorsel: '📖',
  ozet: 'Özgün akademik parçalar üzerinde ana fikir, ayrıntı, çıkarım, bağlamda kelime ve yazarın tutumu sorularını çözmeyi öğrenirsin.',
  dersler: [
    {
      id: 'sinav-u10-d1',
      baslik: 'Ana Fikir ve Ayrıntı Soruları',
      gorsel: '🎯',
      not: `YDS'de okuma parçası soruları 80 sorunun 20'sini, yani dörtte birini oluşturur. Bu derste en sık çıkan iki soru tipini çalışıyoruz: **ana fikir** ve **ayrıntı**.

- **Ana fikir:** Parçanın bütününü kapsayan şıktır. Yalnızca bir cümlede geçen bilgi çok dardır; parçanın konusunu aşan bir genelleme ise çok geniştir.
- **Ayrıntı:** Cevap parçada açıkça yazılıdır, ama şıkta genellikle başka kelimelerle (paraphrase) verilir.

Soru kökleri ve anlamları:
- The passage is mainly concerned with … (Parça esas olarak … ile ilgilidir.)
- The main point of the passage is that … (Parçanın ana fikri, …)
- According to the passage, … (Parçaya göre …)
- It is stated in the passage that … (Parçada … belirtilmektedir.)

**Sınav taktiği:** Önce soru kökünü oku, sonra parçaya dön. Ana fikir için ilk ve son cümleye ve "however, yet, nevertheless" gibi yön değiştiren bağlaçlara özellikle dikkat et: yazarın asıl söylemek istediği çoğu zaman bu bağlaçtan sonra gelir. Ayrıntı sorusunda sorudaki anahtar kelimeyi parçada bul ve yalnızca o cümleyle çevresini oku.

**Sık yapılan hata:** Parçadaki kelimeleri birebir tekrar eden şıkkı doğru sanmak. Bu şıklar çoğu zaman bilgiyi çarpıtır ya da parçada geçen bir ayrıntıyı ana fikir gibi sunar.`,
      alistirmalar: [
        {
          tur: 'secmeli',
          id: 'sinav-u10-d1-a1',
          metin: PARCA_PLASEBO,
          soru: 'The passage is mainly concerned with ___.',
          secenekler: [
            'why the placebo effect is now seen as worth studying and what its limits are',
            'how placebos can replace conventional drugs in the treatment of cancer',
            'the history of drug testing in modern medicine',
            'the reasons why doctors should not tell patients the truth about their pills',
            'the chemical structure of endorphins and how the brain produces them',
          ],
          dogru: 0,
          aciklama:
            "Parça, plasebonun artık kendi başına incelenmeye değer görülmesini ve 'Nevertheless' ile başlayan sınırlarını anlatır; doğru şık iki yarıyı da kapsar. İlaç testlerinin tarihi parçanın konusunu aşan geniş bir başlıktır; ilk cümle yalnızca kısa bir arka plan verir. Endorfinler tek cümlelik bir ayrıntıdır. Kanseri tedavi etme iddiası parçadaki 'cannot shrink tumours' ifadesiyle çelişir. Hastalara gerçeğin söylenmemesi gerektiği fikri parçada savunulmaz; açık plasebo deneyleri tam tersine gerçeğin söylendiği durumları anlatır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d1-a2',
          metin: PARCA_PLASEBO,
          soru: 'According to the passage, placebos ___.',
          secenekler: [
            'can affect how patients experience pain but cannot destroy bacteria',
            'only work when patients do not know that they are taking a placebo',
            'are able to shrink tumours in some patients',
            'have always been considered an important part of treatment',
            'should be given instead of conventional medicines',
          ],
          dogru: 0,
          aciklama:
            "Parça plasebonun ağrı ve yorgunluk gibi belirtilerin yaşanışını etkilediğini, ama bakterileri öldüremediğini açıkça söyler. 'only work when patients do not know' parçadaki açık plasebo deneyleriyle çelişir. 'have always been considered important' ilk cümleyle (a nuisance), 'instead of conventional medicines' ise son cümleyle (not replace) çelişir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d1-a3',
          metin: PARCA_PLASEBO,
          soru: "The word 'complement' in the last sentence is closest in meaning to ___.",
          secenekler: ['supplement', 'praise', 'replace', 'examine', 'prevent'],
          dogru: 0,
          aciklama:
            "'complement' tamamlamak, eksiğini gidermek demektir; 'supplement' (desteklemek, takviye etmek) en yakın anlamdır. 'praise' (övmek) sesçe benzeyen 'compliment' kelimesinin anlamıdır; tipik bir tuzaktır. 'replace' cümlede 'not replace' ile zaten karşıtlık olarak verilmiştir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d1-a4',
          metin: PARCA_PLASEBO,
          soru: 'It can be understood from the passage that ___.',
          secenekler: [
            'the relationship between doctor and patient may affect how well a treatment works',
            'researchers now regard placebos as more effective than real drugs',
            'open-label placebos have been proven to cure chronic diseases',
            'endorphins are released only when patients take real painkillers',
            'medical research no longer needs to take the placebo effect into account',
          ],
          dogru: 0,
          aciklama:
            "Parça, doktorla yapılan şefkatli bir konuşma da dâhil olmak üzere tedavi ritüelinin vücudun kendi iyileşme mekanizmalarını tetikleyebileceğini söyler; doktor-hasta ilişkisinin tedavinin işleyişini etkileyebileceği buradan çıkar. 'more effective than real drugs' ve 'proven to cure' parçada olmayan aşırı iddialardır. Endorfinlerin yalnızca gerçek ilaçla salgılandığı fikri parçayla çelişir. Parça plasebo etkisini kendi başına incelenmeye değer bulur; araştırmada artık hesaba katılması gerekmediği sonucu buradan çıkmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d1-a5',
          metin: PARCA_PLASEBO,
          soru: "The sentence beginning with 'Nevertheless' introduces ___.",
          secenekler: [
            'a limitation of the placebo effect',
            'an example supporting the previous sentence',
            'the result of a specific experiment',
            'the historical background of the topic',
            'a definition of a key term',
          ],
          dogru: 0,
          aciklama:
            "'Nevertheless' (yine de) önceki olumlu bilgilere karşı bir kısıtlama getirir: plasebo her derde deva değildir. Önceki cümleyi destekleyen bir örnek değil, ona karşıt bir yön verir. Tarihî arka plan ilk cümlede, deney sonucu ise önceki cümlelerde yer alır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d1-a6',
          metin: PARCA_DIKEY_TARIM,
          soru: 'The main point of the passage is that vertical farming ___.',
          secenekler: [
            'has clear advantages but is limited by its high energy costs',
            'will soon replace traditional agriculture completely',
            'is the most efficient way to produce wheat and rice',
            'requires more water and pesticides than open-field farming',
            'is popular mainly because it reduces transport costs',
          ],
          dogru: 0,
          aciklama:
            "Parça önce avantajları (az su, az ilaç, düşük taşıma maliyeti), 'Yet' ile de büyük dezavantajı (yüksek elektrik tüketimi) anlatır; ana fikir ikisini birlikte kapsar. Taşıma maliyeti avantajlardan yalnızca biridir, ana fikir için dardır. Buğday ve pirinç parçada içeride yetiştirilemeyecek kadar pahalı ürünler olarak geçer; su ve ilaç bilgisi de tersine çevrilmiştir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d1-a7',
          metin: PARCA_DIKEY_TARIM,
          soru: 'According to the passage, staple foods such as wheat are not grown in vertical farms because ___.',
          secenekler: [
            'it would cost far too much to grow them indoors',
            'they need natural sunlight that artificial lighting cannot imitate',
            'they require large amounts of pesticides',
            'consumers prefer to buy them from local farmers',
            'they cannot easily be transported to cities',
          ],
          dogru: 0,
          aciklama:
            'Son cümle temel gıdaların içeride yetiştirilemeyecek kadar pahalı olduğunu söyler (far too expensive to grow indoors). Yapay ışığın güneşi taklit edemediği parçada yazmaz; parça yalnızca yapay ışığın çok elektrik tükettiğini söyler. İlaç, tüketici tercihi ve taşıma bu ürünlerin nedeni olarak geçmez.',
        },
        {
          tur: 'eslestir',
          id: 'sinav-u10-d1-a8',
          ciftler: [
            ['nuisance', 'baş belası, sıkıntı'],
            ['trigger', 'tetiklemek'],
            ['cure-all', 'her derde deva'],
            ['drawback', 'dezavantaj'],
            ['staple food', 'temel gıda'],
            ['complement', 'tamamlamak'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u10-d1-a9',
          cumle: 'Placebos may influence how patients experience pain and fatigue.',
          anlam: 'Plasebolar hastaların ağrıyı ve yorgunluğu nasıl yaşadığını etkileyebilir.',
          celdiriciler: ['effect', 'cure', 'patient'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u10-d1-a10',
          kaynak: 'Bu yöntemin büyük bir dezavantajı var.',
          cevaplar: [
            'This method has a major drawback.',
            'This method has a big drawback.',
            'This method has a serious drawback.',
            'This method has a significant drawback.',
            'This method has a major disadvantage.',
            'This method has a big disadvantage.',
            'This method has a serious disadvantage.',
            'This method has a significant disadvantage.',
            'This method has got a major drawback.',
            'This method has got a big disadvantage.',
            'There is a major drawback to this method.',
            'There is a major disadvantage to this method.',
            'This method has a major downside.',
            'This method has a big downside.',
          ],
          aciklama:
            "'dezavantaj' = drawback ya da disadvantage; 'büyük' burada major / big / serious olur.",
        },
        {
          tur: 'konus',
          id: 'sinav-u10-d1-a11',
          cumle: 'Placebos should complement, not replace, conventional medicine.',
          anlam: 'Plasebolar modern tıbbın yerini almamalı, onu tamamlamalı.',
          ipucu:
            "'placebos' plı-Sİİ-bouz; 'complement' fiil olarak KOM-pli-ment. 'conventional' kın-VEN-şı-nıl: vurgu ikinci hecede.",
        },
      ],
    },
    {
      id: 'sinav-u10-d2',
      baslik: 'Çıkarım ve Bağlamda Kelime',
      gorsel: '🔍',
      not: `Çıkarım (inference) soruları parçada **açıkça yazmayan** ama parçanın **kesinlikle desteklediği** bilgiyi sorar. Bağlamda kelime soruları ise kelimenin sözlükteki ilk anlamını değil, o cümledeki anlamını ister.

Soru kökleri ve anlamları:
- It can be inferred from the passage that … (Parçadan … sonucu çıkarılabilir.)
- It is implied in the passage that … (Parçada … ima edilmektedir.)
- The word "X" is closest in meaning to … ("X" kelimesi anlamca en çok …'e yakındır.)
- The phrase "X" refers to … ("X" ifadesi …'i kastetmektedir.)

**Kural:** Doğru çıkarım, parçadaki iki bilgiyi birleştirir ya da bir bilgiden zorunlu olarak çıkar. Parçanın söylediğinden fazlasını iddia eden şık yanlıştır.

**Sınav taktiği:** Çıkarım sorusunda "always, never, all, only, the most" gibi aşırı kesin kelimeler içeren şıklara şüpheyle yaklaş; en az iddialı ve parçayla hiç çelişmeyen şık genellikle doğrudur. Bağlamda kelime sorusunda her şıkkı kelimenin yerine koy ve cümleyi baştan oku: anlam bozulmuyorsa doğru şık odur.

**Sık yapılan hata:** Kelimenin bilinen anlamını ya da sesçe benzeyen başka bir kelimeyi seçmek (encode → "şifrelemek", dolayısıyla "gizlemek"). Bir de kendi genel kültürünle cevap vermek: soru, senin bildiğini değil, parçanın desteklediğini sorar.`,
      alistirmalar: [
        {
          tur: 'secmeli',
          id: 'sinav-u10-d2-a1',
          metin: PARCA_DILLER,
          soru: 'It can be inferred from the passage that a language is most seriously at risk when ___.',
          secenekler: [
            'it is no longer passed on from parents to children',
            'it has not yet been written down by linguists',
            'it is spoken in a country with a strong economy',
            'it contains many words for local plants',
            'its speakers live in New Zealand',
          ],
          dogru: 0,
          aciklama:
            'Parça, çocuklar dili evde öğrenmeyi bırakınca düşüşün geri döndürülmesinin çok zorlaştığını söyler; dil kuşaktan kuşağa aktarılmadığında en büyük tehlikenin başladığı buradan çıkar. Yazıya geçirilmemiş olan şey sözlü tarihlerdir, dilin tehlike nedeni olarak sunulmaz. Bitki adları dilin değerini, Yeni Zelanda ise bir başarı örneğini anlatır.',
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d2-a2',
          metin: PARCA_DILLER,
          soru: "The word 'encodes' in the passage is closest in meaning to ___.",
          secenekler: ['stores', 'hides', 'translates', 'replaces', 'reduces'],
          dogru: 0,
          aciklama:
            "Cümle, her dilin bitki adları ve sözlü tarihler gibi eşsiz bir bilgi birikimini içinde taşıdığını söyler: encodes ≈ stores (saklamak, barındırmak). 'hides' kelimenin 'şifrelemek' çağrışımından gelen bir tuzaktır; parça bilginin gizlendiğini değil, korunduğunu anlatır. 'translates' ve 'replaces' cümlenin anlamını bozar.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d2-a3',
          metin: PARCA_DILLER,
          soru: 'According to the passage, language nests are ___.',
          secenekler: [
            'early-childhood programmes that surround children with an endangered language',
            'organisations that record the speech of elderly speakers',
            'schools in which children learn several foreign languages',
            'economic projects that create jobs for native speakers',
            'written collections of oral histories',
          ],
          dogru: 0,
          aciklama:
            "Parça 'language nests' ifadesini hemen ardından tanımlar: küçük çocukların erken yaştan itibaren o dille çevrelendiği okul öncesi programlar. Yaşlıların konuşmalarını kaydetmek ya da sözlü tarihleri yazıya geçirmek parçada bu programlara atfedilmez. 'several foreign languages' ise tek bir tehlikedeki dili canlandırma amacıyla çelişir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d2-a4',
          metin: PARCA_DILLER,
          soru: 'It can be understood from the passage that Māori ___.',
          secenekler: [
            'has benefited from programmes aimed at young children',
            'has never been in danger of disappearing',
            'is now spoken by every child in New Zealand',
            'was revived mainly through written texts',
            'offers better economic opportunities than other languages',
          ],
          dogru: 0,
          aciklama:
            "Son cümle Yeni Zelanda'daki dil yuvası programlarının Maori dilinin canlanmasında büyük pay sahibi sayıldığını söyler. 'never been in danger' parçadaki 'steep decline' ile çelişir. 'every child' aşırı genellemedir. Yazılı metinler parçada canlanmanın yolu olarak geçmez; ekonomik fırsat ise dillerin terk edilme nedeni olarak anılır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d2-a5',
          metin: PARCA_DILLER,
          soru: "The word 'revive' in the last sentence is closest in meaning to ___.",
          secenekler: ['restore', 'review', 'record', 'replace', 'reject'],
          dogru: 0,
          aciklama:
            "'revive' yeniden canlandırmak demektir; dik bir düşüşten sonra dilin yeniden yaygınlaşmasını anlatır: restore (eski hâline getirmek). 'review' yazımca benzediği için cazip gelir ama 'gözden geçirmek' demektir. 'record' yalnızca kayda geçirmektir, dili yeniden konuşulur hâle getirmez.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d2-a6',
          metin: PARCA_GECE_VARDIYASI,
          soru: 'It can be inferred from the passage that ___.',
          secenekler: [
            'getting enough sleep during the day may not fully protect night workers from health problems',
            'night workers who sleep enough during the day face no health risks',
            'digestive disorders are caused only by a lack of sleep',
            "the body's internal clock adjusts easily to night work",
            'day workers generally sleep less than night workers',
          ],
          dogru: 0,
          aciklama:
            "Gündüz yeterince uyuyan gönüllülerde de kan şekeri ve hormon düzeyleri bozulmuştur; demek ki yeterli gündüz uykusu gece çalışanları sağlık sorunlarından tam olarak korumayabilir. 'face no health risks' bu deneyle doğrudan çelişir. 'caused only by a lack of sleep' parçanın çürüttüğü eski görüştür. İç saatin kolayca uyum sağladığı fikri de sonuç cümlesiyle çelişir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d2-a7',
          metin: PARCA_GECE_VARDIYASI,
          soru: "The phrase 'place a strain on' in the last sentence is closest in meaning to ___.",
          secenekler: [
            'put pressure on',
            'take care of',
            'make room for',
            'shed light on',
            'keep track of',
          ],
          dogru: 0,
          aciklama:
            "Parçanın genel havası olumsuzdur: yanlış saatte yemek ve çalışmak organları zorlar. 'place a strain on' = put pressure on (yük bindirmek, zorlamak). 'take care of' ve 'make room for' olumlu ya da nötr anlamlar verir ve cümlenin sağlık sorunlarını açıklama amacıyla çelişir.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u10-d2-a8',
          ciftler: [
            ['endangered', 'tehlike altındaki'],
            ['reverse', 'tersine çevirmek'],
            ['vanish', 'yok olmak'],
            ['disrupt', 'bozmak, sekteye uğratmak'],
            ['revive', 'yeniden canlandırmak'],
            ['strain', 'yük, zorlanma'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u10-d2-a9',
          cumle: 'When the last speakers die, much of their knowledge vanishes.',
          anlam: 'Son konuşucular öldüğünde bilgilerinin büyük bölümü yok olur.',
          celdiriciler: ['speaker', 'vanish', 'dies'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u10-d2-a10',
          kaynak: 'Bu dil yok olma tehlikesiyle karşı karşıya.',
          cevaplar: [
            'This language is in danger of disappearing.',
            'This language is in danger of dying out.',
            'This language is in danger of extinction.',
            'This language is at risk of disappearing.',
            'This language is at risk of dying out.',
            'This language is at risk of extinction.',
            'This language is facing extinction.',
            'This language faces extinction.',
            'This language is facing the threat of extinction.',
            'This language faces the threat of extinction.',
            'This language is facing the danger of extinction.',
            'This language is endangered.',
            'This language is threatened with extinction.',
            'This language is under threat of extinction.',
            'This language is in danger of dying.',
          ],
          aciklama:
            "'-me tehlikesiyle karşı karşıya' kalıbı 'in danger of / at risk of + V-ing' ya da 'face extinction' ile verilir.",
        },
        {
          tur: 'konus',
          id: 'sinav-u10-d2-a11',
          cumle: 'Each language encodes a unique body of knowledge.',
          anlam: 'Her dil eşsiz bir bilgi birikimini içinde barındırır.',
          ipucu:
            "'encodes' in-KOUDZ: vurgu ikinci hecede. 'unique' yu-NİİK; 'knowledge' NO-lic: baştaki 'k' okunmaz.",
        },
      ],
    },
    {
      id: 'sinav-u10-d3',
      baslik: 'Yazarın Tutumu ve Amacı',
      gorsel: '🎭',
      not: `Tutum (attitude) ve amaç (purpose) soruları yazarın konuya nasıl baktığını ve bir bilgiyi neden verdiğini sorar.

Sık çıkan tutum sözcükleri:
- **critical** (eleştirel), **sceptical** (şüpheci), **supportive** (destekleyici)
- **optimistic / cautiously optimistic** (iyimser / temkinli iyimser), **pessimistic** (karamsar)
- **objective / neutral** (tarafsız), **indifferent** (ilgisiz), **ironic** (ironik, alaycı)

Soru kökleri ve anlamları:
- The author's attitude towards X is best described as … (Yazarın X'e karşı tutumu en iyi … olarak tanımlanır.)
- The author mentions X in order to … (Yazar X'ten … amacıyla söz eder.)
- The author would most probably agree that … (Yazar büyük olasılıkla … görüşüne katılır.)

**Kural:** Tutumu yazarın kendi sözcükleri ele verir: "at best misplaced, it is high time" eleştiriyi, "encouraging, remarkable" olumlu bakışı gösterir. "Admittedly / It is true that … but" ise yazarın karşı görüşe kısa bir hak verip kendi tezine döndüğünü gösterir.

**Sınav taktiği:** Önce parçanın son cümlesine bak: yazarlar sonuç ve önerilerini çoğu zaman oraya koyar. Sonra parçadaki değer bildiren sıfat ve zarfları işaretle; bunların çoğu olumluysa olumlu, olumsuzsa olumsuz bir tutum şıkkına yönel.

**Sık yapılan hata:** Yazarın aktardığı başkalarına ait görüşü (some farmers complain …) yazarın görüşü sanmak. Bir de ölçülü bir dille yazılmış parçada "hostile, enthusiastic" gibi aşırı uç tutumları seçmek.`,
      alistirmalar: [
        {
          tur: 'secmeli',
          id: 'sinav-u10-d3-a1',
          metin: PARCA_GSYH,
          soru: "The author's attitude towards using GDP as the main measure of national success can best be described as ___.",
          secenekler: ['critical', 'enthusiastic', 'indifferent', 'nostalgic', 'neutral'],
          dogru: 0,
          aciklama:
            "Yazar GSYH'ye duyulan güveni 'at best, misplaced' (en iyi ihtimalle yersiz) diye niteler, eksiklerini sıralar ve 'it is high time others followed their example' diyerek değişim ister: tutum eleştireldir. 'neutral' en güçlü çeldiricidir, ama yazar açıkça taraf tutar. 'Admittedly' ile verilen kısa olumlu not tutumu tarafsız yapmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d3-a2',
          metin: PARCA_GSYH,
          soru: 'The author mentions an oil spill in order to ___.',
          secenekler: [
            'show that GDP can rise because of events that harm a country',
            'argue that environmental disasters are becoming more common',
            'prove that GDP is difficult to calculate',
            'praise governments for spending money on the environment',
            'explain how income is distributed within a country',
          ],
          dogru: 0,
          aciklama:
            "Petrol sızıntısını temizleme harcaması GSYH'yi artırır; yazar bu örnekle zararlı bir olayın bile büyüme gibi görünebileceğini gösterir. Parça GSYH'nin hesaplanmasının kolay olduğunu söyler (relatively easy to calculate), zor değil. Felaketlerin sıklaştığı ya da hükümetlerin övüldüğü parçada yoktur.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d3-a3',
          metin: PARCA_GSYH,
          soru: "By beginning a sentence with 'Admittedly', the author ___.",
          secenekler: [
            'acknowledges a strength of GDP before continuing to criticise it',
            'gives up the argument made so far',
            'introduces an example of unpaid work',
            'summarises the main points of the passage',
            'quotes an expert who disagrees with the passage',
          ],
          dogru: 0,
          aciklama:
            "'Admittedly' (kabul etmek gerekir ki) karşı tarafa kısa bir hak verir: GSYH kolay hesaplanır ve hızlı karşılaştırma sağlar. Hemen ardından gelen 'But' yazarın eleştirisine döndüğünü gösterir; bu yüzden yazar tezinden vazgeçmez. Parçada bir uzmandan alıntı ya da özet yoktur.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d3-a4',
          metin: PARCA_GSYH,
          soru: "The comparison between GDP and a person's weight suggests that ___.",
          secenekler: [
            'a single measure gives an incomplete picture of a complex situation',
            'GDP should be measured as regularly as body weight',
            "economic growth is harmful to people's health",
            'citizens of rich countries are generally healthier',
            'weight is the most reliable indicator of health',
          ],
          dogru: 0,
          aciklama:
            "Bir insanın sağlığını yalnızca kilosuna bakarak yargılamak eksik olur; yazar GSYH'nin de bir ülkenin durumunu tek başına açıklayamadığını anlatmak için bu benzetmeyi kullanır. Kilonun en güvenilir gösterge olduğu fikri benzetmenin tam tersidir. Büyümenin sağlığa zararlı olduğu ya da zenginlerin daha sağlıklı olduğu parçada söylenmez.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d3-a5',
          metin: PARCA_GSYH,
          soru: 'The author would most probably agree that ___.',
          secenekler: [
            'governments should use indicators that reflect more than economic output',
            'GDP should be abolished because it has no uses at all',
            'unpaid work should be excluded from any measure of success',
            'comparisons between economies are pointless',
            'life expectancy matters less than income',
          ],
          dogru: 0,
          aciklama:
            "Yazar eğitim, yaşam süresi ve çevre kalitesini içeren geniş göstergeleri deneyen ülkeleri örnek gösterir ve diğerlerinin de onları izlemesini ister. 'has no uses at all' parçadaki 'GDP has its uses' ile çelişir. Yazar ücretsiz emeğin göz ardı edilmesini bir eksiklik olarak görür; karşılaştırmaların kolaylığını da GSYH'nin bir yararı sayar.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d3-a6',
          metin: PARCA_KUNDUZ,
          soru: "The author's attitude towards the reintroduction of beavers can best be described as ___.",
          secenekler: [
            'cautiously optimistic',
            'strongly opposed',
            'completely indifferent',
            'deeply pessimistic',
            'openly sarcastic',
          ],
          dogru: 0,
          aciklama:
            "Yazar sonuçları 'encouraging' (umut verici) bulur ve kunduzun dönüşünün herkese yarar sağlayabileceğini söyler; ama bunu 'Handled carefully' (dikkatle yönetilirse) koşuluna bağlar ve çiftçilerin kaygılarını ciddiye alır: temkinli iyimserlik. Karşı çıkma ya da karamsarlık, yazarın önerisi olan 'Rather than abandoning reintroduction' ile çelişir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u10-d3-a7',
          metin: PARCA_KUNDUZ,
          soru: "Which of the following best describes the author's view of the farmers' complaints?",
          secenekler: [
            'They are reasonable and should be addressed rather than ignored.',
            'They are exaggerated and can safely be ignored.',
            'They prove that reintroduction should be stopped.',
            'They are the main reason why beavers disappeared.',
            'They have already been resolved through compensation.',
          ],
          dogru: 0,
          aciklama:
            "Yazar 'their concerns should not be dismissed' (kaygıları göz ardı edilmemeli) der ve yetkililerin toprak sahipleriyle birlikte çalışmasını önerir. Göz ardı edilebileceğini söyleyen şık bununla çelişir; yazar programdan vazgeçilmesini de istemez. Tazminat yalnızca bir öneridir (for example by compensating), yapılmış bir şey olarak anlatılmaz.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u10-d3-a8',
          ciftler: [
            ['misplaced', 'yersiz'],
            ['admittedly', 'kabul etmek gerekir ki'],
            ['steer', 'yönlendirmek'],
            ['dismiss', 'göz ardı etmek'],
            ['compensate', 'tazmin etmek'],
            ['encouraging', 'umut verici'],
          ],
        },
        {
          tur: 'dinle',
          id: 'sinav-u10-d3-a9',
          cumle: 'Their concerns should not be dismissed by the authorities.',
          anlam: 'Kaygıları yetkililer tarafından göz ardı edilmemeli.',
          celdiriciler: ['dismiss', 'concern', 'must'],
        },
        {
          tur: 'yaz',
          id: 'sinav-u10-d3-a10',
          kaynak: 'Yazar bu görüşe karşı çıkıyor.',
          cevaplar: [
            'The author opposes this view.',
            'The author opposes this opinion.',
            'The author is against this view.',
            'The author is against this opinion.',
            'The author objects to this view.',
            'The author objects to this opinion.',
            'The author disagrees with this view.',
            'The author disagrees with this opinion.',
            'The writer opposes this view.',
            'The writer is against this view.',
            'The writer disagrees with this view.',
            'The writer objects to this view.',
            'The writer opposes this opinion.',
            'The writer is against this opinion.',
            'The writer disagrees with this opinion.',
          ],
          aciklama: "'-e karşı çıkmak' = oppose (edatsız), be against ya da object to.",
        },
        {
          tur: 'konus',
          id: 'sinav-u10-d3-a11',
          cumle: 'It is high time other countries followed their example.',
          anlam: 'Diğer ülkelerin de onların örneğini izlemesinin zamanı çoktan geldi.',
          ipucu:
            "'It is high time' kalıbından sonra geçmiş zaman gelir (followed). 'example' ig-ZAAM-pıl: vurgu ikinci hecede.",
        },
      ],
    },
  ],
};

const U11: Unite = {
  id: 'sinav-u11',
  seviye: 'C1',
  baslik: 'Deneme Sınavları',
  gorsel: '📝',
  ozet: 'Kelime, dil bilgisi, cloze, çeviri, diyalog ve paragraf sorularını karışık hâlde çözerek sınav temposuna ve süre yönetimine alışırsın.',
  dersler: [
    {
      id: 'sinav-u11-d1',
      baslik: 'Deneme 1: Süre Planı',
      gorsel: '⏱️',
      not: `Bu ünitedeki üç ders birer **mini deneme**dir: sınavdaki soru tipleri karışık sırayla gelir. Önce gerçek sınavın çerçevesini bil.

- **Süre ve puan:** YDS, e-YDS ve YÖKDİL'de 80 soru için 180 dakikan var. Bütün sorular eşit ağırlıktadır (iptal edilen soru yoksa her biri 1,25 puan) ve yanlış cevaplar doğruları götürmez; bu yüzden hiçbir soruyu boş bırakma.
- **Zaman planı (YDS'deki soru dağılımına göre):** kelime, dil bilgisi ve cloze için yaklaşık 25 dakika; cümle tamamlama ve çeviri için 30 dakika; okuma için 70 dakika; diyalog, yakın anlam, paragraf tamamlama ve anlamı bozan cümle için 35 dakika. Kalan 20 dakika kontrol ve kodlama içindir.
- **Soru başına:** kelime ve dil bilgisinde 30–45 saniye; bir okuma parçası ve soruları için en fazla 12–14 dakika.

Bu denemede çıkan yapılardan örnekler:
- **Had** the signs **been** noticed, … = If the signs had been noticed, … (İşaretler fark edilseydi …)
- **It was not until** 1900 **that** … (… ancak 1900'de …)
- …, **yet** … (…, ama yine de …)

**Sınav taktiği:** İlk turda emin olduğun soruları çöz, zorları işaretleyip geç. Bir soruda iki dakikayı aşıyorsan şıkları ikiye indir, birini işaretle ve devam et; ikinci turda geri dönersin.

**Sık yapılan hata:** İlk 20 soruda 45 dakika harcamak. Okuma ve paragraf soruları sona sıkışır; en çok puan kaybı orada olur.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u11-d1-a1',
          soru: 'The government has introduced new measures to ___ the impact of rising food prices on low-income families.',
          secenekler: ['mitigate', 'exacerbate', 'accelerate', 'attribute', 'undergo'],
          dogru: 0,
          aciklama:
            "Hükümetin dar gelirli aileler için önlem alması, gıda fiyatlarının etkisini azaltmak istediğini gösterir: mitigate (hafifletmek). 'exacerbate' (daha da kötüleştirmek) ve 'accelerate' (hızlandırmak) dil bilgisi olarak uyar ama anlamı tersine çevirir. 'attribute' 'to' ister; 'undergo' (geçirmek, maruz kalmak) ise bu nesneyle anlam vermez.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u11-d1-a2',
          soru: 'By the time the rescue team arrived, the fire ___ most of the building.',
          secenekler: [
            'had destroyed',
            'has destroyed',
            'destroys',
            'would destroy',
            'was being destroyed',
          ],
          dogru: 0,
          aciklama:
            "'By the time + past simple' ana cümlede, o andan önce tamamlanmış eylemi ister: had destroyed. 'has destroyed' ve 'destroys' geçmişteki 'arrived' ile zaman uyumu kurmaz. 'was being destroyed' edilgendir; ardından gelen nesne (most of the building) ile kullanılamaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d1-a3',
          metin:
            'Coral reefs cover less than one per cent of the ocean floor, ___ they support around a quarter of all known marine species.',
          soru: 'Cümledeki boşluğa hangisi getirilmelidir?',
          secenekler: ['yet', 'because', 'so that', 'unless', 'as if'],
          dogru: 0,
          aciklama:
            "Küçük bir alan ile çok sayıda tür arasında beklenmedik bir karşıtlık var: yet (ama yine de). 'because' iki bilgi arasında neden-sonuç ilişkisi kurar; küçük alan türlerin çokluğunun nedeni değildir. 'so that' amaç, 'unless' koşul, 'as if' benzetme bildirir.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u11-d1-a4',
          soru: 'Although the experiment was repeated several times, ___.',
          secenekler: [
            'the researchers failed to obtain consistent results',
            'the results were therefore highly reliable',
            'because the equipment was too old',
            'the scientists were pleased with the consistent findings',
            'it was the first time such a study had been conducted',
          ],
          dogru: 0,
          aciklama:
            "'Although' bir zıtlık ister: deney birçok kez tekrarlanmasına rağmen tutarlı sonuç alınamadı. 'therefore' ve 'pleased with the consistent findings' tekrarın beklenen sonucunu verir; zıtlık yoktur. 'because …' tek başına bir yan cümledir ve ana cümleyi tamamlamaz. 'the first time' ise 'repeated several times' ile çelişir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d1-a5',
          soru: 'It was not until the nineteenth century that scientists began to understand how diseases are transmitted.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Bilim insanları hastalıkların nasıl bulaştığını ancak on dokuzuncu yüzyılda anlamaya başladı.',
            'Bilim insanları on dokuzuncu yüzyıla kadar hastalıkların nasıl bulaştığını anlamıştı.',
            'On dokuzuncu yüzyılda bilim insanları hastalıkların bulaşmasını önlemeye başladı.',
            'Hastalıkların nasıl bulaştığı, on dokuzuncu yüzyıldan beri bilim insanlarınca tam olarak anlaşılmıştır.',
            'Bilim insanlarının hastalıkları anlama çabası on dokuzuncu yüzyılda sona erdi.',
          ],
          dogru: 0,
          aciklama:
            "'It was not until … that …' = ancak … -de. Anlamaya başlama eylemi on dokuzuncu yüzyıldan önce gerçekleşmemiştir. 'yüzyıla kadar anlamıştı' anlamı tersine çevirir. 'önlemeye başladı' 'understand' yerine başka bir fiil kullanır. 'tam olarak anlaşılmıştır' ise 'began to understand' (anlamaya başladı) ifadesindeki başlangıç anlamını kaybeder.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d1-a6',
          soru: 'Kentlerin hızla büyümesi, yerel yönetimlerin konut talebini karşılamasını zorlaştırmaktadır.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'The rapid growth of cities is making it difficult for local governments to meet the demand for housing.',
            'Local governments have made cities grow rapidly in order to meet the demand for housing.',
            'As cities grow rapidly, the demand for housing is being met easily by local governments.',
            'The demand for housing has slowed the growth of cities, which worries local governments.',
            'Local governments find it difficult to control the rapid growth of housing in cities.',
          ],
          dogru: 0,
          aciklama:
            "Özne 'Kentlerin hızla büyümesi' (The rapid growth of cities), yüklem 'zorlaştırmaktadır' (is making it difficult), nesne 'konut talebini karşılamak' (to meet the demand for housing). En güçlü çeldirici 'Local governments find it difficult to control …' cümlesidir: zorluğu korur ama kentlerin değil konutların büyümesinden söz eder ve 'talebi karşılamak' yerine 'denetlemek' der. 'is being met easily' zorluğu kolaylığa çevirir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d1-a7',
          soru: 'Had the warning signs been taken seriously, the crisis could have been avoided.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The crisis could have been prevented if the warning signs had been taken seriously.',
            'The warning signs were taken seriously, so the crisis was avoided.',
            'Even though the warning signs were taken seriously, the crisis could not be avoided.',
            'The crisis occurred before anyone noticed the warning signs.',
            'If warning signs are taken seriously, crises can usually be avoided.',
          ],
          dogru: 0,
          aciklama:
            "'Had … been taken' devrik üçüncü tip koşuldur: 'If the warning signs had been taken seriously'. Gerçekte işaretler ciddiye alınmamış ve kriz yaşanmıştır. 'were taken seriously' içeren iki seçenek bu gerçeği tersine çevirir. 'are taken … can usually be avoided' genel bir kural bildirir ve geçmişteki belirli krizi anlatmaz. İşaretlerin fark edilmeden krizin çıktığını söyleyen seçenek ise kaynak cümlede olmayan bir bilgi ekler: işaretler fark edilmiş ama ciddiye alınmamıştır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d1-a8',
          metin:
            "Selin: I've read the article you recommended about remote working. It was really interesting.\nProfessor: I'm glad you liked it. Did you find the author's argument convincing?\nSelin: ___\nProfessor: That's a fair point. Productivity is notoriously difficult to measure.",
          soru: 'Diyaloğu tamamlayan ifade hangisidir?',
          secenekler: [
            "Partly. She claims productivity increases, but she doesn't explain how she measured it.",
            "Yes, completely. I've decided to work from home from now on.",
            "No, I haven't had time to read it yet.",
            'I think the article was published in a well-known journal.',
            'Actually, I prefer working in the office because it is quieter.',
          ],
          dogru: 0,
          aciklama:
            "Profesörün cevabı ('That's a fair point. Productivity is … difficult to measure') ölçümle ilgili haklı bir itiraza karşılık verir; bu yüzden boşlukta verimliliğin nasıl ölçüldüğünü sorgulayan cevap olmalıdır. 'haven't had time to read it' Selin'in ilk cümlesiyle çelişir. Evden çalışma kararı, ofis tercihi ya da makalenin yayımlandığı dergi, profesörün argümanın ikna edici olup olmadığı sorusuna cevap vermez ve ölçüm konusuna bağlanmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d1-a9',
          metin:
            'Many people assume that creativity is an innate gift that only a few lucky individuals possess. ___ In one long-term study, participants who practised generating ideas every day produced more original solutions after just a few months. Such findings suggest that creativity can be developed much like a muscle.',
          soru: 'Parçadaki boşluğa hangisi getirilmelidir?',
          secenekler: [
            'Research, however, indicates that creative thinking can be improved through regular practice.',
            'Most famous artists were born into wealthy families.',
            'For this reason, schools should stop teaching art and music.',
            'Intelligence tests are often used to select students for university.',
            'Creative people tend to be more anxious than others.',
          ],
          dogru: 0,
          aciklama:
            "İlk cümle yaygın bir inanışı verir; sonraki cümleler bu inanışı çürüten bir araştırma anlatır. Boşluk bu geçişi 'however' ile kuran ve 'regular practice' fikrini tanıtan cümleyi ister. 'For this reason …' önceki inanıştan saçma bir sonuç çıkarır; diğer seçenekler sanatçıların aileleri, zekâ testleri ya da kaygı gibi parçanın akışına bağlanmayan konulara geçer.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d1-a10',
          metin:
            '(I) Volcanic eruptions can have a significant effect on the global climate. (II) When a large volcano erupts, it can inject huge amounts of sulphur dioxide into the upper atmosphere. (III) Some of the most fertile soils in the world are found on the slopes of volcanoes. (IV) There, the gas forms tiny droplets that reflect sunlight back into space. (V) As a result, average global temperatures may fall for a year or more after a major eruption.',
          soru: 'Parçada anlam bütünlüğünü bozan cümle hangisidir?',
          secenekler: ['I', 'II', 'III', 'IV', 'V'],
          dogru: 2,
          aciklama:
            "Parçanın odağı volkanik patlamaların iklime etkisidir. III numaralı cümle 'volcanoes' kelimesini içerir ama verimli topraklara geçerek odağı kaydırır. IV numaralı cümledeki 'There' ve 'the gas' II numaralı cümledeki üst atmosfere ve kükürt dioksite gönderme yapar; III araya girince bu bağ kopar. III çıkarıldığında II, IV ve V kesintisiz bir neden-sonuç zinciri kurar.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u11-d1-a11',
          ciftler: [
            ['mitigate', 'hafifletmek'],
            ['transmit', 'bulaştırmak, iletmek'],
            ['innate', 'doğuştan'],
            ['fertile', 'verimli'],
            ['convincing', 'ikna edici'],
            ['reflect', 'yansıtmak'],
          ],
        },
        {
          tur: 'yaz',
          id: 'sinav-u11-d1-a12',
          kaynak: 'Uyarılar ciddiye alınmadı.',
          cevaplar: [
            'The warnings were not taken seriously.',
            'The warning signs were not taken seriously.',
            'Nobody took the warnings seriously.',
            'No one took the warnings seriously.',
            'The warnings were ignored.',
          ],
          aciklama:
            "'ciddiye almak' = take seriously; edilgen geçmiş zaman: were not taken seriously.",
        },
      ],
    },
    {
      id: 'sinav-u11-d2',
      baslik: 'Deneme 2: Şık Eleme',
      gorsel: '🧠',
      not: `Bu denemede her soru tipinde **şık eleme** yöntemini uygula. Doğruyu hemen göremesen bile yanlışları tek tek atmak, sınavda soru başına zaman kazandırır.

- **Kelime:** Önce cümlenin olumlu ya da olumsuz havasını bul, sonra boşluktan sonraki edatı kontrol et.
- **Dil bilgisi:** Virgülle ayrılmış (ek bilgi veren) sıfat cümleciği "that" ile başlamaz; "which / who" (ya da whom / whose) gerekir.
- **Çeviri:** Önce öznesi ve yüklemi doğru olan şıkları ayır; sonra zaman, olumsuzluk ve nicelik (few, most, only) farklarına bak.
- **Diyalog:** Boşluktan **sonraki** konuşma cevabın anahtarıdır; o cevaba uymayan şıkları ele.

Bu denemede çıkan yapılardan örnekler:
- **Far from** solving the problem, … (Sorunu çözmek bir yana, …)
- **Scarcely had** the meeting begun **when** … (Toplantı başlar başlamaz …)
- The law, **which** comes into force soon, … (Yakında yürürlüğe girecek olan yasa …)
- **Haven't you asked** her? — I have, but … (Ona sormadın mı? — Sordum ama …)

**Sınav taktiği:** Yakın anlam sorularında önce kaynak cümledeki "gerçeği" belirle (ne oldu, ne olmadı). Örneğin "Scarcely had … when" iki olayın neredeyse aynı anda olduğunu söyler; olayların sırasını ya da aradaki süreyi değiştiren şıkları hemen ele.

**Sık yapılan hata:** Çeviri sorularında kaynak cümledeki kelimelerin çoğunu içeren şıkkı seçmek. ÖSYM çeldiricileri aynı kelimeleri kullanır ama yüklemi, zamanı ya da olumsuzluğu değiştirir.`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u11-d2-a1',
          soru: 'The two studies reached ___ different conclusions, which suggests that further research is needed.',
          secenekler: ['markedly', 'barely', 'merely', 'scarcely', 'hardly'],
          dogru: 0,
          aciklama:
            "Daha fazla araştırma gerektiğini söyleyen 'which' cümlesi, iki çalışmanın sonuçlarının belirgin biçimde farklı olduğunu gösterir: markedly. 'barely', 'scarcely' ve 'hardly' farkın neredeyse hiç olmadığını söyler; bu da yeni araştırma gereğini açıklamaz. 'merely different' ise farkı küçümser ve aynı gerekçeyi kurmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u11-d2-a2',
          soru: 'The new law, ___ comes into force next month, will affect thousands of small businesses.',
          secenekler: ['which', 'that', 'who', 'whose', 'what'],
          dogru: 0,
          aciklama:
            "Virgüllerle ayrılmış ek bilgi veren (non-defining) sıfat cümleciği cansız bir isim için 'which' ile başlar. En güçlü çeldirici 'that'tir: anlamca uyar ama virgüllü cümlecikte kullanılmaz. 'who' kişiler içindir; 'whose' arkasından isim ister; 'what' sıfat cümleciği başlatmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d2-a3',
          metin:
            'The Antarctic ice sheet holds more than half of the fresh water on Earth. ___ it were to melt completely, global sea levels would rise by dozens of metres.',
          soru: 'Parçadaki boşluğa hangisi getirilmelidir?',
          secenekler: ['If', 'Unless', 'Even', 'Whether', 'Although'],
          dogru: 0,
          aciklama:
            "'were to melt … would rise' gerçek dışı ya da düşük olasılıklı bir koşul anlatır ve 'If' ile başlar. 'Unless' (-mezse) anlamı tersine çevirir: buz erimezse deniz seviyesi yükselmez. 'Even' tek başına bağlaç değildir; 'Whether' ve 'Although' da koşul-sonuç ilişkisi kurmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u11-d2-a4',
          soru: '___, the museum attracted more visitors last year than ever before.',
          secenekler: [
            'Thanks to its new interactive exhibitions',
            'Despite offering free entry for the first time',
            'Because its opening hours were reduced',
            'Unless it raises its ticket prices',
            'Even if it closes for renovation',
          ],
          dogru: 0,
          aciklama:
            "Ziyaretçi rekoru olumlu bir sonuçtur ve onu açıklayan bir neden ister: Thanks to (sayesinde). 'Despite offering free entry' en güçlü çeldiricidir: ücretsiz giriş ziyaretçiyi artırır, 'despite' ise beklentiye aykırılık bildirir. Saatlerin azalması artışı açıklamaz; 'Unless' ve 'Even if' şimdiki zamanda olup geçmişteki sonuçla zaman uyumu kurmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d2-a5',
          soru: 'Far from solving the problem, the new regulations have made it considerably worse.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Yeni düzenlemeler sorunu çözmek bir yana, onu önemli ölçüde kötüleştirdi.',
            'Yeni düzenlemeler sorunu tamamen çözemese de durumu biraz iyileştirdi.',
            'Sorun, yeni düzenlemelerden çok önce önemli ölçüde kötüleşmişti.',
            'Yeni düzenlemeler sorunun çözümünden uzak olsa da işe yarayabilir.',
            'Sorunu çözmek için getirilen yeni düzenlemeler biraz gecikti.',
          ],
          dogru: 0,
          aciklama:
            "'Far from …ing' = …mek bir yana (tam tersine). 'made it considerably worse' = önemli ölçüde kötüleştirdi. 'biraz iyileştirdi' ve 'işe yarayabilir' anlamı tersine çevirir. 'çok önce kötüleşmişti' düzenlemelerle sorun arasındaki neden-sonuç ilişkisini kaldırır; 'gecikti' ise cümlede yoktur.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d2-a6',
          soru: 'Araştırmacılar, uyku eksikliğinin karar verme becerisini olumsuz etkilediğini ileri sürüyor.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Researchers suggest that lack of sleep has a negative effect on decision-making skills.',
            'Researchers have proved that people who make decisions quickly sleep less.',
            'According to researchers, decision-making skills improve when people sleep less.',
            'Researchers claim that lack of sleep is caused by poor decision-making.',
            'Researchers are trying to find out whether sleep affects decision-making skills.',
          ],
          dogru: 0,
          aciklama:
            "'ileri sürmek' = suggest / claim / argue; 'olumsuz etkilemek' = have a negative effect on. 'claim that lack of sleep is caused by …' fiili doğru çevirir ama neden-sonucu tersine çevirir. 'are trying to find out whether' iddiayı bir soruya dönüştürür; 'have proved' ise farklı bir iddia ileri sürer.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d2-a7',
          metin:
            "Ahmet: The deadline for the scholarship application is tomorrow, and I still haven't got a reference letter.\nDeniz: ___\nAhmet: I have, but she's at a conference abroad and hasn't replied yet.",
          soru: 'Diyaloğu tamamlayan ifade hangisidir?',
          secenekler: [
            "Haven't you asked your supervisor to write one for you?",
            "Congratulations! When did you hear that you'd got the scholarship?",
            "Why don't you apply for the scholarship next year instead?",
            'Did you know that the deadline has been extended by a month?',
            "I've already submitted mine, so I can't help you.",
          ],
          dogru: 0,
          aciklama:
            "Ahmet'in cevabındaki 'I have' present perfect bir evet-hayır sorusunu yanıtlar, 'she' ise daha önce anılmış bir kadını gösterir; yalnızca danışmanına sorup sormadığını soran seçenek ikisini de karşılar. Burs kazandığını varsayan tebrik Ahmet'in ilk cümlesiyle çelişir. 'Did you know …?' sorusu 'I did' ile yanıtlanırdı, 'I have' ile değil; ayrıca 'she' zamirine bir gönderge sağlamaz. Gelecek yıl başvurmayı öneren ya da kendi başvurusunu anlatan cümleler de 'I have' cevabına uymaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d2-a8',
          soru: 'Scarcely had the meeting begun when the fire alarm went off.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'The fire alarm went off almost as soon as the meeting had begun.',
            'The meeting began after the fire alarm had gone off.',
            'The fire alarm rarely goes off during meetings.',
            'The meeting was cancelled because the fire alarm went off.',
            'The meeting had been going on for hours when the fire alarm went off.',
          ],
          dogru: 0,
          aciklama:
            "'Scarcely had … when' = … -er -mez: toplantı başlar başlamaz alarm çaldı. Olayların sırasını tersine çeviren ve araya saatler koyan seçenekler bu anlamı bozar. 'rarely' kelimesi 'scarcely' ile karıştırılır ama genel bir sıklık bildirir. Toplantının iptal edildiği cümlede söylenmez.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d2-a9',
          metin:
            'Bilingual children often perform better than monolingual children on tasks that require switching between different rules. Psychologists believe this is because bilinguals constantly have to choose which language to use while suppressing the other. ___ This advantage, however, appears to be smaller than early studies claimed, and some recent experiments have failed to find it at all.',
          soru: 'Parçadaki boşluğa hangisi getirilmelidir?',
          secenekler: [
            "Such constant practice may strengthen the brain's ability to control attention.",
            'Many bilingual children grow up in immigrant families.',
            'Monolingual children, therefore, should not be taught foreign languages.',
            'Most schools in Europe teach at least two foreign languages.',
            'On the other hand, bilingual children sometimes have smaller vocabularies in each of their languages.',
          ],
          dogru: 0,
          aciklama:
            "Boşluktan önceki cümle iki dilli çocukların sürekli dil seçtiğini anlatır; 'Such constant practice' bu bilgiye bağlanır ve 'This advantage' ifadesinin gösterdiği avantajı (dikkat denetimi) tanıtır. Kelime dağarcığıyla ilgili cümle bir dezavantajdır; ardından gelen 'This advantage, however' ile akış kopar. Diğer seçenekler göçmen aileler ya da okullar gibi konu dışı bilgilere geçer.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d2-a10',
          metin:
            '(I) The invention of the printing press in the fifteenth century transformed the way knowledge spread in Europe. (II) Before then, books had to be copied by hand, which made them rare and extremely expensive. (III) With the new technology, hundreds of identical copies of a text could be produced far more quickly than by hand. (IV) As books became cheaper, literacy gradually increased and new ideas reached a far wider audience. (V) Paper had been invented in China many centuries earlier.',
          soru: 'Parçada anlam bütünlüğünü bozan cümle hangisidir?',
          secenekler: ['I', 'II', 'III', 'IV', 'V'],
          dogru: 4,
          aciklama:
            "Parça matbaanın Avrupa'da bilginin yayılmasını nasıl değiştirdiğini anlatır: öncesi (II), yeni teknoloji (III) ve sonucu (IV). IV numaralı cümle okuryazarlığın artmasıyla bu anlatıyı tamamlar. V numaralı cümle ise kâğıdın Çin'deki icadına geçerek odağı kaydırır; matbaanın bilginin yayılmasına etkisine hiçbir şey eklemez.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u11-d2-a11',
          ciftler: [
            ['markedly', 'belirgin biçimde'],
            ['come into force', 'yürürlüğe girmek'],
            ['far from', '… bir yana'],
            ['suppress', 'bastırmak'],
            ['literacy', 'okuryazarlık'],
            ['reference letter', 'referans mektubu'],
          ],
        },
        {
          tur: 'yaz',
          id: 'sinav-u11-d2-a12',
          kaynak: 'Yeni yasa gelecek ay yürürlüğe girecek.',
          cevaplar: [
            'The new law will come into force next month.',
            'The new law comes into force next month.',
            'The new law is going to come into force next month.',
            'The new law will come into effect next month.',
            'The new law comes into effect next month.',
            'The new law will take effect next month.',
            'The new law takes effect next month.',
            'The new law will enter into force next month.',
            'The new law will be in force next month.',
            'The new law is going to come into effect next month.',
            'The new law enters into force next month.',
          ],
          aciklama: "'yürürlüğe girmek' = come into force / come into effect / take effect.",
        },
      ],
    },
    {
      id: 'sinav-u11-d3',
      baslik: 'Deneme 3: Son Tur',
      gorsel: '🏁',
      not: `Son denemede soruları sınavdaki gibi tek oturuşta çöz: on iki dakikalık bir süre tut ve bitince yanlışlarının açıklamalarını oku.

**Sınav günü için kurallar:**
- **Boş bırakma:** Yanlışlar doğruları götürmediği için süre biterken boş kalan her soruyu işaretle. İki şıkka indirebildiysen şansın yüzde ellidir.
- **Kodlamayı ertele ama unutma:** Kâğıt sınavda her bölümün sonunda toplu kodla; son 15 dakikaya bırakma.
- **Okumayı böl:** Bir parçayla takılırsan ötekine geç; parçalar birbirinden bağımsızdır.

Bu denemede çıkan yapılardan örnekler:
- **Not only did** the decision **increase** the cost, **but** it **also** … (Karar yalnızca maliyeti artırmakla kalmadı, aynı zamanda …)
- **The extent to which** genes determine intelligence … (Genlerin zekâyı ne ölçüde belirlediği …)
- **Despite having** limited resources, … (Kaynakları kısıtlı olmasına rağmen …)
- … **until** they **have been** confirmed. (… doğrulanana kadar.)

**Sınav taktiği:** Cümle tamamlama sorusunda önce verilen yarının zamanına ve bağlacına bak. "will not … until" gibi bir yapı gelecek anlamlıdır; arkasından "will" değil, şimdiki ya da present perfect zaman gelir (until they have been confirmed).

**Sık yapılan hata:** "Not only" ile başlayan cümlede devrik yapıyı unutmak: "Not only the decision increased …" yanlış, doğrusu "Not only did the decision increase …".`,
      alistirmalar: [
        {
          tur: 'bosluk',
          id: 'sinav-u11-d3-a1',
          soru: "The professor's lecture was so ___ that even students with no background in physics could follow it.",
          secenekler: ['lucid', 'obscure', 'tedious', 'redundant', 'ambiguous'],
          dogru: 0,
          aciklama:
            "'so … that even students with no background … could follow it' dersin çok anlaşılır olduğunu gösterir: lucid (açık, berrak). 'obscure' (anlaşılması güç) ve 'ambiguous' (belirsiz) tam ters anlam verir. 'tedious' (sıkıcı) ve 'redundant' (gereksiz) de dersin herkesçe izlenebilmesini açıklamaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u11-d3-a2',
          soru: 'Not only ___ the cost of the project, but it also delayed its completion by two years.',
          secenekler: [
            'did the decision increase',
            'the decision increased',
            'does the decision increase',
            'the decision has increased',
            'increased the decision',
          ],
          dogru: 0,
          aciklama:
            "'Not only' cümle başına gelince yardımcı fiil özneden önce gelir (devrik yapı); ikinci yarıdaki 'delayed' geçmiş zaman olduğu için 'did' gerekir. En güçlü çeldirici 'the decision increased'dır: anlam doğrudur ama devrik yapı yoktur. 'does' zaman uyumunu bozar; 'increased the decision' ise özneyle nesneyi karıştırır.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d3-a3',
          metin:
            'Several large coastal cities are slowly sinking ___ the excessive pumping of groundwater, which causes the soil beneath them to compact.',
          soru: 'Cümledeki boşluğa hangisi getirilmelidir?',
          secenekler: ['due to', 'in spite of', 'instead of', 'in addition to', 'regardless of'],
          dogru: 0,
          aciklama:
            "Yeraltı suyunun aşırı çekilmesi toprağı sıkıştırır ve kentin çökmesine neden olur: due to (nedeniyle). 'in spite of' beklentiye aykırılık bildirir; oysa su çekimi çökmeyi açıklar. 'instead of', 'in addition to' ve 'regardless of' neden-sonuç ilişkisi kurmaz.",
        },
        {
          tur: 'bosluk',
          id: 'sinav-u11-d3-a4',
          soru: 'The findings will not be published ___.',
          secenekler: [
            'until they have been confirmed by an independent laboratory',
            'because an independent laboratory has confirmed them',
            'as soon as they had been confirmed by an independent laboratory',
            'while an independent laboratory confirmed them last year',
            'so that an independent laboratory can never confirm them',
          ],
          dogru: 0,
          aciklama:
            "'will not … until' (… -e kadar …-meyecek) gelecek anlamlı yapıya present perfect ile bağlanır: bulgular doğrulanmadan yayımlanmayacak. 'because … has confirmed them' mantıksızdır: doğrulandığı için yayımlanmaması beklenmez. 'had been confirmed' ve 'confirmed them last year' gelecek zamanlı ana cümleyle zaman uyumu kurmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d3-a5',
          soru: 'The extent to which genes determine intelligence remains a matter of debate.\n\nCümlenin Türkçedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Genlerin zekâyı ne ölçüde belirlediği hâlâ tartışma konusudur.',
            'Genlerin zekâyı belirlediği artık tartışılmamaktadır.',
            'Zekâyı belirleyen genlerin sayısı tartışmalı olmayı sürdürüyor.',
            'Genlerin zekâ üzerindeki etkisi tartışmalarla kanıtlanmıştır.',
            'Zekâ, genlerden çok çevre tarafından belirlenir ve bu tartışma konusudur.',
          ],
          dogru: 0,
          aciklama:
            "'The extent to which' = ne ölçüde; 'remains a matter of debate' = hâlâ tartışma konusudur. 'artık tartışılmamaktadır' ve 'kanıtlanmıştır' tartışmanın sürdüğü bilgisini tersine çevirir. 'genlerin sayısı' 'extent' (ölçü) kelimesini yanlış çevirir; çevre karşılaştırması ise cümlede yoktur.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d3-a6',
          soru: 'Uzmanlar, iklim değişikliğiyle mücadelede bireysel çabaların tek başına yeterli olmadığı konusunda hemfikir.\n\nCümlenin İngilizcedeki en yakın karşılığı hangisidir?',
          secenekler: [
            'Experts agree that individual efforts alone are not enough to combat climate change.',
            'Experts disagree on whether individual efforts can help combat climate change.',
            'According to experts, climate change can only be combated through individual efforts.',
            'Experts agree that governments are not making enough effort to combat climate change.',
            'Experts believe that individual efforts are more effective than government policies.',
          ],
          dogru: 0,
          aciklama:
            "'hemfikir' = agree, 'tek başına' = alone, 'yeterli olmadığı' = are not enough. 'governments are not making enough effort' 'agree' ve 'not enough' kelimelerini korur ama bireysel çabaların yerine hükümetleri koyar. 'can only be combated through individual efforts' anlamı tersine çevirir; 'disagree' ise uzlaşmayı anlaşmazlığa dönüştürür.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d3-a7',
          soru: 'Despite having very limited resources, the team managed to complete the survey on time.\n\nCümleye anlamca en yakın cümle hangisidir?',
          secenekler: [
            'Although its resources were very limited, the team succeeded in completing the survey on time.',
            'Because its resources were limited, the team could not complete the survey on time.',
            'The team completed the survey on time, so it was given more resources.',
            'If the team had had more resources, it would have completed the survey on time.',
            'The team had plenty of resources, but it still finished the survey late.',
          ],
          dogru: 0,
          aciklama:
            "'Despite having' = Although … were; 'managed to complete' = succeeded in completing. Ekibin anketi zamanında bitiremediğini ima eden üç seçenek (could not complete, would have completed, finished late) gerçeği tersine çevirir. Ödül olarak kaynak verilmesi ise cümlede yoktur.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d3-a8',
          metin:
            "Student: Could I possibly hand in my essay a few days late? I've been ill all week.\nLecturer: ___\nStudent: Yes, I went to the university clinic on Monday. I'll bring the report tomorrow.",
          soru: 'Diyaloğu tamamlayan ifade hangisidir?',
          secenekler: [
            'That should be fine. Do you have a medical report?',
            "I'm sorry, but I've already marked all the essays.",
            'Have you finished the essay already?',
            'Which essay topic did you choose?',
            'Did you enjoy the lecture on Monday?',
          ],
          dogru: 0,
          aciklama:
            "Öğrencinin cevabı ('Yes, I went to the university clinic … I'll bring the report') bir sağlık raporu sorusunu yanıtlar. 'Did you enjoy the lecture on Monday?' 'Monday' kelimesiyle tuzak kurar, ama 'Yes' ve ardından klinikten söz etmek bu soruya uymaz. Ödevin bitip bitmediği ya da konusu raporla ilgili değildir.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d3-a9',
          metin:
            'Fast fashion has made clothing cheaper than ever before. ___ The textile industry is now one of the largest industrial consumers of water in the world, and a large proportion of discarded clothes ends up in landfill sites. Consumers, therefore, are increasingly being urged to buy fewer garments of higher quality.',
          soru: 'Parçadaki boşluğa hangisi getirilmelidir?',
          secenekler: [
            'This low price, however, hides a considerable environmental cost.',
            'Many fashion designers studied at art schools in Paris and Milan.',
            'As a result, consumers no longer need to worry about the environment.',
            'Online shopping has also become more popular among older consumers.',
            'Therefore, clothes today last much longer than they did in the past.',
          ],
          dogru: 0,
          aciklama:
            "İlk cümle ucuzluktan, sonraki cümleler su tüketimi ve çöpe giden giysiler gibi çevresel zararlardan söz eder. Boşluk, 'however' ile bu geçişi kuran ve 'environmental cost' kavramını tanıtan cümleyi ister. 'no longer need to worry' son cümledeki tüketicilere yapılan çağrıyla çelişir; 'last much longer' ise çöpe giden giysi bilgisiyle bağdaşmaz. Tasarımcıların eğitimi ve çevrim içi alışveriş parçanın çevre konusuna bağlanmaz.",
        },
        {
          tur: 'secmeli',
          id: 'sinav-u11-d3-a10',
          metin:
            '(I) Octopuses are widely regarded as the most intelligent invertebrates. (II) Octopus is a popular dish in many Mediterranean countries. (III) In laboratory experiments, they have learned to open jars, find their way through mazes and even recognise individual human keepers. (IV) In the wild, some have been observed carrying coconut shells to use as portable shelters. (V) Scientists believe that such problem-solving skills evolved to help them survive in complex and changing environments.',
          soru: 'Parçada anlam bütünlüğünü bozan cümle hangisidir?',
          secenekler: ['I', 'II', 'III', 'IV', 'V'],
          dogru: 1,
          aciklama:
            "Parçanın odağı ahtapotların zekâsıdır. II numaralı cümle 'octopus' kelimesini içerir ama Akdeniz mutfağına geçerek odağı kaydırır. I numaralı cümledeki zekâ iddiası III ve IV numaralı cümlelerdeki kavanoz açma ve kabuk taşıma örnekleriyle desteklenir; V'teki 'such problem-solving skills' de bu örneklere bağlanır. II araya girince iddia ile kanıtı arasındaki bağ kopar.",
        },
        {
          tur: 'eslestir',
          id: 'sinav-u11-d3-a11',
          ciftler: [
            ['lucid', 'açık, anlaşılır'],
            ['extent', 'ölçü, derece'],
            ['discarded', 'atılmış'],
            ['invertebrate', 'omurgasız'],
            ['groundwater', 'yeraltı suyu'],
            ['compact', 'sıkışmak'],
          ],
        },
        {
          tur: 'yaz',
          id: 'sinav-u11-d3-a12',
          kaynak: 'Bu konu hâlâ tartışmalıdır.',
          cevaplar: [
            'This issue is still controversial.',
            'This subject is still controversial.',
            'This topic is still controversial.',
            'This issue remains controversial.',
            'This subject remains controversial.',
            'This topic remains controversial.',
            'This issue is still debated.',
            'This topic is still debated.',
            'This issue is still a matter of debate.',
            'This topic is still a matter of debate.',
            'This issue is still disputed.',
            'This topic is still disputed.',
            'This subject is still debated.',
            'This subject is still a matter of debate.',
            'This issue remains a matter of debate.',
            'This topic remains a matter of debate.',
            'This issue is still debatable.',
            'This matter is still controversial.',
          ],
          aciklama: "'tartışmalı' = controversial ya da a matter of debate; 'hâlâ' = still.",
        },
      ],
    },
  ],
};

export const SINAV_EK: readonly Unite[] = [U8, U9, U10, U11];
