# One-off (2026-10-25): adds 48 Cebuano questions (8 per dice number) from Leksiyon lessons not used before,
# and gives every built-in question a `hint` naming its lesson. Proof quotes are checked against the lesson
# text saved in research/leksiyon-2026-10-25/ (read with the gstack /browse headed browser).
# Run from the repo root: python3 -I scripts/add-leksiyon-questions-2026-10-25.py
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'research' / 'leksiyon-2026-10-25'
DATA = ROOT / 'src' / 'data' / 'questions.ceb.json'
SOURCES = ROOT / 'research' / 'questions-ceb-sources.md'

toc = {}
for line in (RAW / 'toc.txt').read_text().splitlines():
    n, title, url = line.split('|')
    toc[int(n)] = (title.strip(), url.strip())

# (id, lesson, difficulty, question, answers, explanation, bible reference, proof — " … " joins separate sentences)
NEW = [
    ('ceb-1-09', 3, 'easy', 'Unsang hayopa ang nakig-estorya kang Eva didto sa garden?', ['bitin', 'halas', 'serpent', 'snake'],
     'Usa ka daotang anghel, si Satanas nga Yawa, ang nagpasulti sa bitin aron ilaron si Eva.', 'Genesis 3:1-24',
     'Dihay adlaw nga walay kauban si Eva ug may bitin nga nakig-estorya niya.'),
    ('ceb-1-10', 4, 'easy', 'Kinsa ang anak ni Adan ug Eva nga nag-atiman ug mga karnero ug gipatay sa iyang magulang nga si Cain?', ['Abel'],
     'Si Abel nag-atiman ug mga karnero, ug gipatay siya sa iyang magulang nga si Cain didto sa uma.', 'Genesis 4:1-12',
     'Ang kamagulangan nga si Cain nagtanom ug ang iyang manghod nga si Abel nag-atiman ug mga karnero. … Sila rang duha didto, unya gipatay niya ang iyang igsoon.'),
    ('ceb-1-11', 39, 'easy', 'Kinsa ang unang hari sa Israel?', ['Saul', 'Haring Saul'],
     'Giingnan ni Jehova si Samuel nga si Saul ang mahimong unang hari sa Israel.', '1 Samuel 9:15-17; 10:20-24',
     'Giingnan ni Jehova si Samuel nga si Saul ang mahimong unang hari.'),
    ('ceb-1-12', 84, 'easy', 'Kinsa ang apostoles nga mikanaog sa sakayan ug milakaw ibabaw sa tubig paingon kang Jesus?', ['Pedro', 'Simon Pedro', 'Apostol Pedro', 'Peter'],
     'Milakaw si Pedro ibabaw sa tubig, pero dihang mitan-aw siya sa bagyo nahadlok siya ug nag-anam siyag kaunlod.', 'Mateo 14:23-34',
     'Bisag kusog ang bagyo, mikanaog si Pedro gikan sa sakayan ug milakaw ibabaw sa tubig paingon kang Jesus.'),
    ('ceb-1-13', 90, 'easy', 'Kinsa ang gobernador nga misugot nga patyon si Jesus?', ['Pilato', 'Poncio Pilato', 'Pilate', 'Pontius Pilate'],
     'Walay nakitang sala si Pilato kang Jesus, pero misugot siya nga patyon si Jesus tungod sa singgit sa mga tawo.', 'Lucas 23:1-25',
     'Busa misugot si Pilato nga patyon si Jesus.'),
    ('ceb-1-14', 87, 'easy', 'Kinsa ang apostoles nga gitunolan ni Jesus ug tinapay ingong ilhanan nga siya ang motraydor kaniya?', ['Judas', 'Judas Iskariote', 'Judas Iscariote', 'Judas Iscariot'],
     'Gitunolan ni Jesus ug tinapay si Judas Iskariote, ug dihadiha mitindog si Judas ug milakaw.', 'Juan 13:1, 2, 26, 30',
     'Dayon gitunolan niyag tinapay si Judas Iskariote.'),
    ('ceb-1-15', 103, 'easy', 'Mahimong unsa ang yuta sa umaabot sumala sa saad ni Jehova?', ['paraiso', 'paradise'],
     'Hapit nang laglagon si Satanas ug ang tanang daotan, ug mahimo nang paraiso ang yuta.', 'Pinadayag 21:3, 4',
     'Mahimo nang paraiso ang yuta.'),
    ('ceb-1-16', 1, 'easy', 'Unsay gihimo ni Jehova sa wala pa niya himoa ang mga butang nga makita?', ['anghel', 'mga anghel', 'angels'],
     'Sa wala pa himoa ni Jehova ang mga butang nga makita, naghimo siyag daghan kaayong anghel.', 'Genesis 1:1-26',
     'Sa wala pa niya himoa ang mga butang nga makita, naghimo siyag daghan kaayong anghel.'),

    ('ceb-2-09', 19, 'easy', 'Nahimong unsa ang tubig sa Suba sa Nilo dihang gibunal ni Aaron ang iyang sungkod?', ['dugo', 'blood'],
     'Nahimong dugo ang Suba sa Nilo, namatay ang mga isda, ug dili na mainom ang tubig.', 'Exodo 7:8–8:19',
     'Nagtan-aw si Paraon dihang gibunal ni Aaron ang iyang sungkod sa suba, ug nahimo kining dugo.'),
    ('ceb-2-10', 24, 'easy', 'Unsang hayopa ang estatuwa nga gihimo ni Aaron gikan sa bulawan sa katawhan?', ['baka', 'bulawang baka', 'baka nga bulawan', 'nati', 'calf', 'golden calf'],
     'Gitunaw ni Aaron ang bulawan ug gihimo kining estatuwa nga baka, ug gisimba kini sa katawhan.', 'Exodo 32:1-30',
     'Iyang gitunaw ang bulawan ug gihimo kining estatuwa nga baka.'),
    ('ceb-2-11', 35, 'easy', 'Unsay ngalan sa anak nga lalaki nga gihatag ni Jehova kang Ana human siya miampo?', ['Samuel'],
     'Gitubag ni Jehova ang pag-ampo ni Ana, ug iyang ginganlan ang iyang anak ug Samuel.', '1 Samuel 1:1–2:11',
     'Wala ray usa ka tuig, nanganak siyag lalaki. Ginganlan niya kinig Samuel.'),
    ('ceb-2-12', 11, 'easy', 'Unsang hayopa ang gihalad ni Abraham puli kang Isaac?', ['karnero', 'laking karnero', 'ram', 'sheep'],
     'Nakakita si Abraham ug karnero nga nasangit ang sungay sa kahoykahoy, ug kini ang iyang gihalad puli kang Isaac.', 'Genesis 22:1-18',
     'Dayon nakakita si Abraham ug karnero nga ang sungay nasangit sa mga kahoykahoy. … Iya dayong gitangtang ang hikot ni Isaac ug ang karnero maoy iyang gihalad.'),
    ('ceb-2-13', 31, 'easy', 'Unsay gihangyo ni Josue kang Jehova nga pahunongon aron mapildi nila ang mga Canaanhon?', ['adlaw', 'ang adlaw', 'adlaw ug bulan', 'sun'],
     'May pagsalig si Josue kang Jehova, ug wala mosalop ang adlaw hangtod napildi ang mga Canaanhon.', 'Josue 10:1-15',
     'Dayon gihangyo ni Josue si Jehova nga pahunongon ang adlaw.'),
    ('ceb-2-14', 78, 'easy', 'Unsay trabaho ni Pedro, Andres, Santiago, ug Juan dihang gidapit sila ni Jesus?', ['mangingisda', 'mananagat', 'nangisda', 'fisherman', 'fishermen'],
     'Mga mangingisda sila, ug giingnan sila ni Jesus: ‘Himoon mo nakong mangingisdag tawo.’', 'Marcos 1:14-20',
     'Dayon miadto si Jesus sa Dagat sa Galilea ug didto niya nakita ang iyang upat ka tinun-an nga mga mangingisda. Sila si Pedro, Andres, Santiago, ug Juan.'),
    ('ceb-2-15', 82, 'easy', 'Kompletoha ang pag-ampo nga gitudlo ni Jesus: “___ namo nga anaa sa mga langit, balaanon unta ang imong ngalan.”', ['Amahan', 'Amahan namo', 'Father'],
     'Gitudloan ni Jesus ang iyang mga tinun-an nga moampo: “Amahan namo nga anaa sa mga langit, balaanon unta ang imong ngalan.”', 'Mateo 6:2-18',
     '“Amahan namo nga anaa sa mga langit, balaanon unta ang imong ngalan.'),
    ('ceb-2-16', 60, 'easy', 'Unsang metal ang ulo sa dakong estatuwa nga nakita ni Nabucodonosor sa iyang damgo?', ['bulawan', 'gold', 'oro'],
     'Ang bulawan nga ulo sa estatuwa nagrepresentar sa gingharian ni Nabucodonosor.', 'Daniel 2:1-49',
     'Nakakita kag dakong estatuwa nga bulawan ang ulo'),

    ('ceb-3-09', 15, 'medium', 'Kinsa ang kamanghorang anak ni Jacob kansang sako gibutangan ni Jose sa iyang kopa nga silver?', ['Benjamin'],
     'Gisulayan ni Jose ang iyang mga igsoon pinaagi sa pagbutang sa iyang kopa nga silver sa sako ni Benjamin.', 'Genesis 40:1–45:28',
     'Kauban na nila ang kamanghoran nga si Benjamin. … Gibutang niya sa sako ni Benjamin ang iyang kopa nga silver'),
    ('ceb-3-10', 21, 'medium', 'Unsay tawag sa espesyal nga panihapon nga himoon sa mga Israelinhon kada tuig aron mahinumdoman ang ilang pagkaluwas sa Ehipto?', ['Paskuwa', 'Paskwa', 'Passover'],
     'Kada tuig himoon sa mga Israelinhon ang Paskuwa aron mahinumdoman kon giunsa sila pagluwas ni Jehova.', 'Exodo 11:1–12:42',
     'Para mahinumdoman nila kon giunsa sila pagluwas ni Jehova, kinahanglang himoon nila ang maong espesyal nga panihapon kada tuig. Gitawag kanag Paskuwa.'),
    ('ceb-3-11', 23, 'medium', 'Asang bukid nagkampo ang mga Israelinhon mga duha ka bulan human sila mobiya sa Ehipto?', ['Sinai', 'Bukid sa Sinai', 'Mount Sinai', 'Horeb', 'Bukid sa Horeb'],
     'Didto sa Bukid sa Sinai, misaad ang mga Israelinhon nga buhaton nila ang tanan nga isulti ni Jehova.', 'Exodo 19:1–20:21',
     'Mga duha ka bulan human makabiya sa Ehipto ang mga Israelinhon, miabot sila sa Bukid sa Sinai ug nagkampo didto.'),
    ('ceb-3-12', 25, 'medium', 'Kinsa ang hataas nga saserdote nga mao lang ang puwedeng mosulod sa Labing Balaan sa tabernakulo?', ['Aaron', 'Aron'],
     'Ang hataas nga saserdote nga si Aaron mosulod sa Labing Balaan kas-a kada tuig aron motanyag ug halad.', 'Exodo 25:1-9; Hebreohanon 9:1-7',
     'Ang hataas nga saserdote lang nga si Aaron ang puwedeng mosulod sa Labing Balaan.'),
    ('ceb-3-13', 26, 'medium', 'Kinsa ang espiya nga kauban ni Josue nga miingon: ‘Mapildi nato sila’?', ['Caleb', 'Kaleb'],
     'Si Caleb ug si Josue may pagsalig kang Jehova, busa sila lang sa 12 ka espiya ang nag-ingon nga mapildi nila ang Canaan.', 'Numeros 13:1–14:38',
     'Dayon si Caleb miingon: ‘Mapildi nato sila. Mangadto na ta didto!’'),
    ('ceb-3-14', 37, 'medium', 'Sa ikapila ka higayon nga nadungog ni Samuel ang tingog nakahunahuna si Eli nga si Jehova ang nagtawag kaniya?', ['ikatulo', 'ikatulong higayon', '3', 'tulo', 'tres'],
     'Sa ikatulong higayon, nakahunahuna si Eli nga si Jehova ang nagtawag kang Samuel.', '1 Samuel 3:1-21',
     'Sa ikatulong higayon nga nadungog ni Samuel ang tingog, nakahunahuna si Eli nga si Jehova ang nagtawag kang Samuel.'),
    ('ceb-3-15', 41, 'medium', 'Unsang instrumento ang maayo kaayong tugtogon ni David?', ['alpa', 'arpa', 'harp'],
     'Maayo kaayong motugtog ug alpa si David, pero gilabay siyag bangkaw ni Saul samtang nagtugtog siya.', '1 Samuel 16:14-23; 18:5-16',
     'Maayo kaayong motugtog ug alpa si David.'),
    ('ceb-3-16', 47, 'medium', 'Kinsa ang gisugo ni Jehova nga mopuli kang Elias ingong propeta?', ['Eliseo', 'Elisha', 'propetang Eliseo'],
     'Giingnan ni Jehova si Elias nga pahibaloon si Eliseo nga siya ang mopuli niya nga propeta.', '1 Hari 19:1-18',
     'Lakaw ug pahibaloa si Eliseo nga siya ang mopuli nimo nga propeta.'),

    ('ceb-4-09', 56, 'medium', 'Pila ang edad ni Josias dihang nahimo siyang hari sa Juda?', ['8', 'otso', 'walo', '8 anyos'],
     'Otso anyos si Josias dihang nahimo siyang hari, ug gimahal niya ang Balaod sa Diyos.', '2 Hari 22:1–23:30',
     'Si Josias nahimong hari sa Juda dihang otso anyos siya.'),
    ('ceb-4-10', 73, 'medium', 'Gikan sa balhibo sa unsang hayopa gihimo ang sinina ni Juan nga Tigbawtismo?', ['kamelyo', 'camel'],
     'Simple ang kinabuhi ni Juan: hinimo sa balhibo sa kamelyo ang iyang sinina, ug dulon ug dugos ang iyang pagkaon.', 'Mateo 3:1-11',
     'Hinimo sa balhibo sa kamelyo ang iyang sinina, ug dulon ug dugos ang iyang pagkaon.'),
    ('ceb-4-11', 75, 'medium', 'Unsay gihagit sa Yawa kang Jesus nga himoon niyang tinapay?', ['bato', 'mga bato', 'stones'],
     'Gihagit sa Yawa si Jesus nga himoong tinapay ang mga bato, pero mitubag si Jesus gamit ang Kasulatan.', 'Mateo 4:1-11',
     '‘Kon ikaw Anak sa Diyos, himoang tinapay kining mga bato.’'),
    ('ceb-4-12', 80, 'medium', 'Unsay gihimo ni Jesus sa tibuok gabii didto sa bukid sa wala pa niya pilia ang 12 ka apostoles?', ['nag-ampo', 'miampo', 'pag-ampo', 'ampo', 'prayed'],
     'Gusto ni Jesus nga magpagiya kang Jehova, busa nag-inusara siyang nag-ampo sa tibuok gabii.', 'Lucas 6:12-16',
     'Busa miadto siya sa bukid, ug nag-inusara siyang nag-ampo sa tibuok gabii.'),
    ('ceb-4-13', 81, 'medium', 'Unsay giingon ni Jesus nga tan-awon nato kay kanunayng giseguro sa Diyos nga naa silay pagkaon?', ['langgam', 'mga langgam', 'birds'],
     'Gitudlo ni Jesus nga dili ta angayng mabalaka kay kabalo si Jehova kon unsay atong gikinahanglan.', 'Mateo 6:19-34',
     'Tan-awa ang mga langgam. Kanunayng giseguro sa Diyos nga naa silay pagkaon.'),
    ('ceb-4-14', 88, 'medium', 'Asang gardena miadto si Jesus ug ang iyang mga apostoles sa gabii nga gidakop siya?', ['Getsemane', 'Gethsemane', 'garden sa Getsemane'],
     'Miampo si Jesus didto sa garden sa Getsemane, ug didto siya gitraydoran ni Judas pinaagi sa halok.', 'Mateo 26:36-57',
     'Pag-abot nila sa garden sa Getsemane, miingon si Jesus kanila … Nahibalo siya kon asa makita si Jesus kay sige man silag adto sa maong garden.'),
    ('ceb-4-15', 92, 'medium', 'Asang bahina sa sakayan gisugo ni Jesus nga itaktak sa mga mangingisda ang ilang pukot?', ['tuo', 'tuong bahin', 'tuo nga bahin', 'right', 'right side'],
     'Dihang gitaktak nila ang pukot sa tuong bahin sa sakayan, napuno kini ug isda.', 'Juan 21:1-19',
     '“Itaktak ang pukot sa tuong bahin sa sakayan.”'),
    ('ceb-4-16', 93, 'medium', 'Asang bukid nakigkita si Jesus sa iyang mga apostoles sa kataposang higayon sa wala pa siya mosaka sa langit?', ['Bukid sa mga Olibo', 'Olibo', 'Olivo', 'Mount of Olives'],
     'Didto sa Bukid sa mga Olibo, misaka si Jesus sa langit ug natabonan siya sa panganod.', 'Buhat 1:2-14',
     'Dayon nakigkita si Jesus sa iyang mga apostoles sa kataposang higayon didto sa Bukid sa mga Olibo.'),

    ('ceb-5-09', 20, 'hard', 'Unsay ngalan sa lugar sa Ehipto nga gipuy-an sa mga Israelinhon diin walay langaw?', ['Gosen', 'Goshen', 'yuta sa Gosen'],
     'Sugod sa ikaupat nga silot, ang mga Ehiptohanon lang ang naapektohan; walay langaw didto sa Gosen.', 'Exodo 8:20–10:29',
     'Pero walay langaw didto sa Gosen nga maoy gipuy-an sa mga Israelinhon.'),
    ('ceb-5-10', 27, 'hard', 'Kinsa ang mirebelde kang Moises uban kang Datan, Abiram, ug sa 250 ka lalaki?', ['Kore', 'Kora', 'Korah'],
     'Si Kore ug ang iyang kaubang 250 ka lalaki nasunog tungod sa kalayo nga gipadala ni Jehova.', 'Numeros 16:1–17:13',
     'Samtang ang mga Israelinhon naa sa kamingawan, si Kore, Datan, Abiram, ug ang 250 nila ka kauban mirebelde kang Moises.'),
    ('ceb-5-11', 29, 'hard', 'Pila ang edad ni Moises dihang namatay siya?', ['120', '120 anyos', 'usa ka gatos ug baynte', 'sientos baynte'],
     'Gipakita ni Jehova kang Moises ang Yutang Saad gikan sa Bukid sa Nebo, ug namatay siya sa edad nga 120.', 'Deuteronomio 34:1-12',
     'Namatay si Moises sa edad nga 120.'),
    ('ceb-5-12', 32, 'hard', 'Kinsa ang babaye nga mipatay kang Sisera pinaagi sa ugsok sa tolda?', ['Jael', 'Hael'],
     'Mitago si Sisera sa tolda ni Jael, ug giugbok ni Jael sa iyang ulo ang ugsok sa tolda.', 'Maghuhukom 4:1–5:31',
     'Midagan siya ug mitago sa tolda sa babaye nga si Jael. … Dayon hinayhinay nga miduol si Jael niya ug giugbok sa iyang ulo ang ugsok sa tolda maong namatay siya.'),
    ('ceb-5-13', 42, 'hard', 'Unsay ngalan sa anak ni Jonatan nga gipapuyo ni David sa iyang palasyo?', ['Mepiboset', 'Mefiboset', 'Mephibosheth'],
     'Wala gyod kalimti ni David ang iyang amigo nga si Jonatan, busa iyang giatiman ang anak niini nga si Mepiboset.', '2 Samuel 9:1-13',
     'Pagkamatay ni Jonatan, gipangita ni David ang anak ni Jonatan nga si Mepiboset … Didto ka mopuyo sa akong palasyo ug didto pod ka mokaon sa akong lamesa.'),
    ('ceb-5-14', 43, 'hard', 'Kinsa ang propeta nga gipaadto ni Jehova kang David aron badlongon siya sa iyang sala?', ['Natan', 'Nathan', 'propetang Natan'],
     'Gisultihan ni Natan si David bahin sa dato nga mikuha sa karnero sa pobre, dayon miingon: ‘Ikaw tong tawhana!’', '2 Samuel 11:1–12:14',
     'Gipaadto ni Jehova ang propetang si Natan kang David.'),
    ('ceb-5-15', 48, 'hard', 'Asang lungsora gipaadto ni Jehova si Elias diin may biyuda nga mohatag niyag pagkaon panahon sa hulaw?', ['Zarepta', 'Sarepta', 'Zarephath', 'lungsod sa Zarepta'],
     'Wala mahurot ang harina ug lana sa biyuda sa Zarepta, ug gibanhaw pa gani ang iyang anak.', '1 Hari 17:8-24',
     'Dihang naghulaw, miingon si Jehova kang Elias: ‘Adto sa Zarepta. May biyuda nga mohatag nimog pagkaon didto.’'),
    ('ceb-5-16', 49, 'hard', 'Kinsa ang tag-iya sa ubasan nga gusto kaayong maangkon ni Haring Ahab?', ['Nabot', 'Naboth'],
     'Wala ibaligya ni Nabot ang ubasan kay supak kini sa Balaod ni Jehova, busa gipapatay siya ni Jezebel.', '1 Hari 21:1-29',
     'Makita ni Haring Ahab gikan sa bentana sa iyang palasyo sa Jezreel ang ubasan sa tawong ginganlag Nabot. Gusto ni Ahab nga maiyaha ang ubasan'),

    ('ceb-6-09', 55, 'hard', 'Pila ka sundalong Asiryanhon ang gipatay sa anghel ni Jehova sa usa ka gabii?', ['185000', '185,000', '185 000', 'usa ka gatos ug kawaloan ug lima ka libo'],
     'Gipanalipdan ni Jehova ang Jerusalem: sa usa ka gabii gipatay sa iyang anghel ang 185,000 ka sundalo ni Senakerib.', '2 Hari 19:1-37',
     'Gipatay sa anghel ang 185,000 ka sundalo!'),
    ('ceb-6-10', 57, 'hard', 'Kinsa ang opisyal sa palasyo nga mitabang nga makuha si Jeremias gikan sa lapokon nga atabay?', ['Ebed-melek', 'Ebedmelek', 'Ebed melek', 'Ebed-melech'],
     'Gisultihan ni Ebed-melek ang hari nga mamatay si Jeremias sa atabay, ug gisugo siya sa hari nga kuhaon si Jeremias.', 'Jeremias 38:1-13',
     'Dayon ang opisyal sa palasyo nga si Ebed-melek miingon sa hari: ‘Gihulog sa mga pangulo si Jeremias sa atabay! … Giingnan sa hari si Ebed-melek nga magdalag 30 ka tawo aron kuhaon si Jeremias gikan sa atabay.'),
    ('ceb-6-11', 63, 'hard', 'Kinsa ang hari sa Babilonya nga nakakitag kamot nga nagsulat diha sa bungbong?', ['Belsazar', 'Belshazzar', 'Baltasar', 'Haring Belsazar'],
     'Gipatin-aw ni Daniel kang Belsazar nga pildihon sa mga Medianhon ug Persianhon ang Babilonya.', 'Daniel 5:1-30',
     'Si Belsazar ang sunod nga naghari sa Babilonya. … Dayon kalit silang nakakitag kamot diha sa bungbong, ug may gisulat kini nga dili masabtan.'),
    ('ceb-6-12', 67, 'hard', 'Sulod sa pila ka adlaw nahuman ang mga paril ug ganghaan sa Jerusalem sa panahon ni Nehemias?', ['52', '52 ka adlaw', 'kalim-an ug duha', 'singkuwenta y dos'],
     'Bisag gibugalbugalan sila sa mga kaaway, nahuman ang mga paril ug ganghaan sa 52 lang ka adlaw.', 'Nehemias 6:1-19',
     'Nahuman ang mga paril ug ganghaan sa 52 lang ka adlaw.'),
    ('ceb-6-13', 85, 'hard', 'Asang linawa gipaadto ni Jesus ang tawong natawong buta aron manghilam-os?', ['Siloam', 'Siloe', 'linaw sa Siloam', 'linaw sa Siloe'],
     'Gipahiran ni Jesus ug lapok ang mata sa tawo, ug human siya manghilam-os sa linaw sa Siloam, nakakita na siya.', 'Juan 9:1-41',
     'Si Jesus miingon kaniya: ‘Lakaw, panghilam-os sa linaw sa Siloam.’'),
    ('ceb-6-14', 91, 'hard', 'Asang lungsora padulong ang duha ka tinun-an dihang midungan kanila si Jesus nga nabanhaw?', ['Emmaus', 'Emaus', 'lungsod sa Emmaus'],
     'Wala dayon mailhi sa duha ka tinun-an si Jesus; nailhan lang nila siya human niya ampoi ang tinapay didto sa Emmaus.', 'Lucas 23:50–24:43',
     'Niana pong adlawa, dihay duha ka tinun-an nga naglakaw padulong sa Emmaus gikan sa Jerusalem.'),
    ('ceb-6-15', 95, 'hard', 'Kinsa ang Pariseo nga mitambag sa Sanhedrin nga dili patyon ang mga apostoles?', ['Gamaliel'],
     'Miingon si Gamaliel nga basig gitabangan sa Diyos ang mga apostoles, busa wala sila patya.', 'Buhat 5:12-42',
     'Pero ang Pariseo nga si Gamaliel mibarog ug miingon: ‘Pagbantay mo! Basig gitabangan tuod sila sa Diyos.'),
    ('ceb-6-16', 102, 'hard', 'Asang islaha gipriso si apostol Juan dihang gipakitaan siya ni Jesus ug mga panan-awon?', ['Patmos', 'isla sa Patmos'],
     'Didto sa isla sa Patmos, gipakitaan ni Jesus si Juan ug 16 ka panan-awon bahin sa umaabot.', 'Pinadayag 1:1-3',
     'Samtang gipriso si apostol Juan didto sa isla sa Patmos, gipakitaan siya ni Jesus ug 16 ka panan-awon'),
]


def body(n):
    return re.sub(r'\s+', ' ', (RAW / f'B{n}.txt').read_text())


def fold(text):
    return ' ' + ' '.join(re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', text.lower()).encode('ascii', 'ignore').decode()).split()) + ' '


def hint(n, answers):
    # The lesson title alone when it does not give the answer away; otherwise just the lesson number.
    title = toc[n][0]
    gives_away = any(len(fold(a).strip()) > 2 and fold(a) in fold(title) for a in answers)
    return f'Leksiyon {n}' if gives_away else f'Leksiyon {n} — {title}'


data = json.loads(DATA.read_text())
old = [q for q in data['questions'] if q['id'] not in {x[0] for x in NEW}]
assert len(old) == 48, len(old)
used = set()
for q in old:
    n = int(re.match(r'Leksiyon (\d+)', q['reference']).group(1))
    used.add(n)
    q['hint'] = hint(n, q['acceptedAnswers'])

problems = []
rows = []
fresh = []
for qid, n, diff, text, answers, expl, ref, proof in NEW:
    if n in used:
        problems.append(f'{qid}: lesson {n} already used')
    used.add(n)
    page = body(n)
    for part in proof.split(' … '):
        if re.sub(r'\s+', ' ', part) not in page:
            problems.append(f'{qid}: proof not verbatim in lesson {n}: {part!r}')
    dice = int(qid.split('-')[1])
    assert diff == ('easy' if dice <= 2 else 'medium' if dice <= 4 else 'hard'), qid
    fresh.append({'id': qid, 'diceNumber': dice, 'difficulty': diff, 'question': text, 'acceptedAnswers': answers,
                  'reference': f'Leksiyon {n} · {ref}', 'hint': hint(n, answers), 'explanation': expl})
    title, url = toc[n]
    rows.append(f'| {qid} | Leksiyon {n} — {title} | {url} | {proof} |')

if problems:
    print('\n'.join(problems))
    sys.exit(1)

merged = sorted(old + fresh, key=lambda q: q['id'])
DATA.write_text(json.dumps({'version': 1, 'questions': merged}, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'research' / 'questions-ceb.json').write_text(DATA.read_text())

src = SOURCES.read_text()
marker = '\n## Added 2026-10-25\n'
if marker not in src:
    src = src.rstrip('\n') + '\n' + marker + '\nRead with the gstack /browse headed browser on 2026-10-25 (page text saved in research/leksiyon-2026-10-25/). One question per lesson not used before.\n\n| id | Lesson | URL | Proof (verbatim) |\n|---|---|---|---|\n' + '\n'.join(rows) + '\n'
    SOURCES.write_text(src)
print(f'OK: {len(merged)} questions, {len(fresh)} new, lessons used {len(used)}')
