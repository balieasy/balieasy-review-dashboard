import type {Language} from './reply-languages';
import type {Detail} from './reply-review-context';

type Copy={positive:Partial<Record<Detail,string[]>>;negative:Partial<Record<Detail,string[]>>};
export const contextCopy:Partial<Record<Language,Copy>>={
 en:{positive:{
  esim:['Good to hear the SIM service was helpful.','Glad you had a good experience getting your SIM with us.','Thanks for trusting us with your SIM needs.'],
  activation:['Good to hear the setup went smoothly.','Glad getting your SIM set up was straightforward.','It is good to know the activation was easy to follow.'],
  connection:['Glad the connection worked well for you.','Good to hear you had a reliable connection.','Thanks for letting us know how the connection worked for you.'],
  price:['It is good to hear you felt the price was fair.','Glad you found the pricing reasonable.','Thanks for sharing your thoughts on the value.'],
  explanation:['Glad the explanations made things clear.','Good to hear the team took the time to explain everything.','It is good to know the instructions were easy to follow.'],
  communication:['Glad the team was easy to reach when you needed help.','Good to hear the communication was helpful.','Thanks for mentioning the support you received through your messages.'],
  delivery:['Good to hear the delivery went smoothly.','Glad you received what you needed without any hassle.','Thanks for sharing how the delivery went.'],
  recovery:['Glad the team could help get things working again.','Good to hear the issue was sorted out with the team’s help.','Thanks for giving the team a chance to help with the problem.'],
  returning:['It means a lot that you came back to us.','Thanks for choosing us again.','We appreciate you coming back for another visit.'],
 },negative:{
  activation:['Sorry you had trouble getting the SIM activated.','We are sorry the setup did not go smoothly.','Sorry the activation was frustrating.'],
  connection:['Sorry the connection was not working as you expected.','We are sorry you had trouble staying connected.','Sorry the network experience let you down.'],
  price:['We are sorry the pricing left you disappointed.','Thank you for raising your concern about the price.','We understand your concern about the cost.'],
  waiting:['Sorry you were kept waiting.','We are sorry the wait affected your experience.','Thank you for pointing out the delay; we are sorry about the wait.'],
  explanation:['Sorry our explanation left things unclear.','We are sorry you did not get the clarity you needed.','Thank you for pointing out where the information was unclear.'],
  communication:['Sorry you had difficulty getting a response from us.','We are sorry the communication fell short.','Sorry you were left waiting for a reply.'],
  delivery:['Sorry you had trouble with the delivery.','We are sorry you did not receive what you expected.','Thank you for flagging the issue with the delivery.'],
  helpful:['Sorry the interaction with our team was disappointing.','We are sorry you did not receive the help you needed.','Thank you for raising your concern about how you were treated.'],
  visa:['We are sorry you had a difficult experience with the visa process.','Sorry the visa service did not meet your expectations.','Thank you for explaining your concern about the visa process.'],
  esim:['Sorry you had a disappointing experience with the SIM service.','We are sorry the SIM service fell short for you.'],
  topup:['Sorry you had trouble with the top-up.','We are sorry the top-up did not go as expected.'],
 }},
 id:{positive:{
  esim:['Senang layanan SIM kami membantu Anda.','Senang pengalaman mengurus SIM-nya berjalan baik.','Terima kasih sudah mempercayakan kebutuhan SIM Anda kepada kami.'],
  activation:['Senang aktivasi SIM-nya berjalan lancar.','Syukurlah pemasangan SIM-nya mudah diikuti.','Senang proses pengaturan SIM-nya tidak merepotkan.'],
  connection:['Senang koneksinya bekerja dengan baik untuk Anda.','Syukurlah jaringan internetnya bisa diandalkan.','Terima kasih sudah berbagi pengalaman tentang koneksinya.'],
  price:['Senang harganya dirasa sesuai.','Terima kasih sudah berbagi pendapat tentang harganya.','Senang Anda merasa harga dan layanannya sepadan.'],
  explanation:['Senang penjelasan tim kami mudah dipahami.','Syukurlah penjelasannya membantu Anda memahami prosesnya.','Terima kasih sudah menyoroti penjelasan dari tim kami.'],
  communication:['Senang komunikasi dengan tim kami membantu.','Syukurlah tim kami mudah dihubungi saat Anda perlu bantuan.','Terima kasih sudah berbagi pengalaman komunikasi dengan tim kami.'],
  delivery:['Senang pengirimannya berjalan lancar.','Syukurlah yang Anda perlukan sudah diterima tanpa kendala.','Terima kasih sudah berbagi pengalaman tentang pengirimannya.'],
  recovery:['Syukurlah kendalanya berhasil diatasi bersama tim kami.','Senang tim kami bisa membantu sampai kembali berfungsi.','Terima kasih sudah memberi tim kami kesempatan membantu kendalanya.'],
  returning:['Terima kasih sudah kembali menggunakan layanan kami.','Senang bisa membantu Anda lagi.','Kami menghargai kepercayaan Anda untuk datang kembali.'],
 },negative:{
  activation:['Mohon maaf aktivasi SIM-nya mengalami kendala.','Maaf proses pemasangan SIM-nya belum berjalan lancar.','Mohon maaf proses aktivasi ini merepotkan Anda.'],
  connection:['Mohon maaf koneksinya belum bekerja sesuai harapan.','Maaf Anda mengalami kendala jaringan.','Mohon maaf koneksi internetnya mengecewakan.'],
  price:['Terima kasih sudah menyampaikan keberatan tentang harganya.','Kami memahami kekhawatiran Anda mengenai biaya tersebut.','Mohon maaf harga yang Anda terima membuat kecewa.'],
  waiting:['Mohon maaf Anda harus menunggu.','Maaf waktu tunggunya mengganggu pengalaman Anda.','Terima kasih sudah menyampaikan kendala waktu tunggu ini.'],
  explanation:['Mohon maaf penjelasan kami belum cukup jelas.','Maaf informasi yang Anda perlukan belum tersampaikan dengan baik.','Terima kasih sudah menunjukkan bagian informasi yang belum jelas.'],
  communication:['Mohon maaf Anda kesulitan mendapatkan balasan dari kami.','Maaf komunikasi dengan tim kami belum sesuai harapan.','Mohon maaf Anda harus menunggu respons kami.'],
  delivery:['Mohon maaf ada kendala pada pengirimannya.','Maaf yang Anda terima belum sesuai harapan.','Terima kasih sudah memberi tahu kendala pengiriman ini.'],
  helpful:['Mohon maaf interaksi dengan tim kami mengecewakan.','Maaf bantuan yang Anda perlukan belum Anda dapatkan.','Terima kasih sudah menyampaikan keberatan tentang pelayanan tim kami.'],
  visa:['Mohon maaf pengalaman pengurusan visanya belum sesuai harapan.','Maaf Anda mengalami kendala dalam proses visa.','Terima kasih sudah menjelaskan kendala pengurusan visa ini.'],
  esim:['Mohon maaf pengalaman layanan SIM-nya mengecewakan.','Maaf layanan SIM kami belum sesuai harapan Anda.'],
  topup:['Mohon maaf ada kendala saat isi ulang.','Maaf proses isi ulangnya belum sesuai harapan.'],
 }},
};

// Specific technical/price/waiting feedback in the other supported languages.
// Each row: activation issue, connection issue, price concern, wait, communication,
// followed by praise for setup and clear explanations. No transaction facts added.
const localized:Partial<Record<Language,string[]>>={
 ru:['Извините за сложности с активацией.','Нам жаль, что у вас возникли проблемы со связью.','Спасибо, что сообщили о своих замечаниях к стоимости.','Извините, что вам пришлось ждать.','Извините, что общение с нашей командой вас разочаровало.','Рады, что настройка прошла без затруднений.','Приятно узнать, что объяснения команды были понятными.'],
 uk:['Перепрошуємо за труднощі з активацією.','Нам шкода, що у вас виникли проблеми зі зв’язком.','Дякуємо, що повідомили про зауваження до вартості.','Перепрошуємо, що вам довелося чекати.','Перепрошуємо, що спілкування з командою вас розчарувало.','Раді, що налаштування пройшло без труднощів.','Приємно знати, що пояснення команди були зрозумілими.'],
 de:['Es tut uns leid, dass es Probleme bei der Aktivierung gab.','Es tut uns leid, dass die Verbindung nicht wie erwartet funktioniert hat.','Danke, dass Sie Ihre Bedenken zum Preis ansprechen.','Entschuldigen Sie bitte die Wartezeit.','Es tut uns leid, dass die Kommunikation enttäuschend war.','Schön, dass die Einrichtung reibungslos geklappt hat.','Schön zu hören, dass die Erklärungen verständlich waren.'],
 fr:['Nous sommes désolés pour les difficultés d’activation.','Nous sommes désolés que la connexion n’ait pas fonctionné comme prévu.','Merci de nous avoir fait part de vos réserves sur le prix.','Nous sommes désolés de vous avoir fait attendre.','Nous sommes désolés que les échanges avec notre équipe aient été décevants.','Nous sommes ravis que la configuration se soit bien passée.','Nous sommes heureux que les explications aient été claires.'],
 es:['Sentimos las dificultades con la activación.','Sentimos que la conexión no haya funcionado como esperaba.','Gracias por compartir su preocupación sobre el precio.','Sentimos haberle hecho esperar.','Sentimos que la comunicación con nuestro equipo haya sido decepcionante.','Nos alegra que la configuración haya ido bien.','Nos alegra saber que las explicaciones fueron claras.'],
 it:['Ci dispiace per le difficoltà con l’attivazione.','Ci dispiace che la connessione non abbia funzionato come previsto.','Grazie per averci segnalato le sue perplessità sul prezzo.','Ci dispiace averla fatta aspettare.','Ci dispiace che la comunicazione con il nostro team sia stata deludente.','Siamo felici che la configurazione sia andata bene.','Ci fa piacere sapere che le spiegazioni erano chiare.'],
 pt:['Lamentamos as dificuldades com a ativação.','Lamentamos que a conexão não tenha funcionado como esperava.','Obrigado por compartilhar sua preocupação com o preço.','Pedimos desculpas pela espera.','Lamentamos que a comunicação com nossa equipe tenha sido decepcionante.','Ficamos felizes que a configuração tenha corrido bem.','É bom saber que as explicações foram claras.'],
 nl:['Het spijt ons dat er problemen waren met de activering.','Het spijt ons dat de verbinding niet naar verwachting werkte.','Bedankt dat u uw zorgen over de prijs deelt.','Onze excuses dat u moest wachten.','Het spijt ons dat de communicatie met ons team teleurstellend was.','Fijn dat het instellen soepel is verlopen.','Fijn om te horen dat de uitleg duidelijk was.'],
 pl:['Przepraszamy za trudności z aktywacją.','Przykro nam, że połączenie nie działało zgodnie z oczekiwaniami.','Dziękujemy za podzielenie się uwagami dotyczącymi ceny.','Przepraszamy za czas oczekiwania.','Przykro nam, że kontakt z naszym zespołem był rozczarowujący.','Cieszymy się, że konfiguracja przebiegła sprawnie.','Miło wiedzieć, że wyjaśnienia były zrozumiałe.'],
 tr:['Etkinleştirme sırasında yaşadığınız zorluklar için üzgünüz.','Bağlantının beklediğiniz gibi çalışmamasına üzüldük.','Fiyat konusundaki endişenizi paylaştığınız için teşekkür ederiz.','Sizi beklettiğimiz için özür dileriz.','Ekibimizle iletişimin hayal kırıklığı yaratmasına üzüldük.','Kurulumun sorunsuz geçmesine sevindik.','Açıklamaların anlaşılır olduğunu duymak güzel.'],
 zh:['很抱歉，激活过程中给您带来了困难。','很抱歉，网络连接没有达到您的预期。','谢谢您提出对价格的意见。','很抱歉让您久等了。','很抱歉，与我们团队的沟通让您失望了。','很高兴设置过程顺利。','很高兴团队的说明让您容易理解。'],
 ja:['アクティベーションでご不便をおかけし、申し訳ありません。','通信がご期待どおりに使えず、申し訳ありません。','料金についてのご意見をお寄せいただき、ありがとうございます。','お待たせしてしまい、申し訳ありません。','スタッフとのやり取りでご期待に添えず、申し訳ありません。','設定がスムーズに進んだとのこと、うれしく思います。','説明が分かりやすかったと伺い、うれしく思います。'],
 ko:['개통 과정에서 불편을 드려 죄송합니다.','통신 연결이 기대에 미치지 못해 죄송합니다.','가격에 대한 우려를 말씀해 주셔서 감사합니다.','기다리시게 해서 죄송합니다.','저희 팀과의 소통이 실망스러우셨다니 죄송합니다.','설정이 순조롭게 진행되어 다행입니다.','설명을 이해하기 쉬우셨다니 기쁩니다.'],
 th:['ขออภัยสำหรับปัญหาในการเปิดใช้งาน','ขออภัยที่การเชื่อมต่อไม่เป็นไปตามที่คุณคาดหวัง','ขอบคุณที่แจ้งข้อกังวลเรื่องราคาให้เราทราบ','ขออภัยที่ทำให้คุณต้องรอ','ขออภัยที่การสื่อสารกับทีมของเราทำให้คุณผิดหวัง','ดีใจที่การตั้งค่าเป็นไปอย่างราบรื่น','ดีใจที่คำอธิบายของทีมเข้าใจง่าย'],
 vi:['Chúng tôi xin lỗi vì những khó khăn khi kích hoạt.','Chúng tôi xin lỗi vì kết nối không hoạt động như bạn mong đợi.','Cảm ơn bạn đã chia sẻ băn khoăn về giá.','Chúng tôi xin lỗi vì đã để bạn chờ đợi.','Chúng tôi xin lỗi vì việc trao đổi với đội ngũ đã khiến bạn thất vọng.','Rất vui vì việc cài đặt diễn ra suôn sẻ.','Thật tốt khi biết phần giải thích dễ hiểu.'],
 ar:['نعتذر عن الصعوبات التي واجهتك في التفعيل.','نأسف لأن الاتصال لم يعمل كما توقعت.','شكرًا لمشاركة ملاحظتك بشأن السعر.','نعتذر عن اضطرارك إلى الانتظار.','نأسف لأن التواصل مع فريقنا كان مخيبًا للآمال.','يسعدنا أن الإعداد تم بسلاسة.','يسعدنا أن الشرح كان واضحًا لك.'],
};
for(const [language,lines] of Object.entries(localized))contextCopy[language as Language]={positive:{activation:[lines[5]],explanation:[lines[6]]},negative:{activation:[lines[0]],connection:[lines[1]],price:[lines[2]],waiting:[lines[3]],communication:[lines[4]]}};

contextCopy.fr!.positive.price=['Ravis que vous ayez trouvé une option adaptée à votre budget.','Merci pour votre retour sur les prix.'];
