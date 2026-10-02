// Text of the Privacy Notice and Terms of Service, in Bahasa Melayu and English (the
// PDPA asks for a privacy notice in both). Each section has an id (used for links such
// as /terma#bayaran), a title and blocks: a string is a paragraph, an array is a
// bulleted list, and **text** is shown in bold. {email} and {website} are filled in from
// src/legal/business.js; who runs Digital Depot is shown by the page itself.
//
// Keep this in step with what the app really does. Have a lawyer review changes.

export const LEGAL = {
  privacy: {
    ms: {
      title: 'Notis Privasi',
      intro: [
        'Notis ini menerangkan data peribadi yang diproses oleh Digital Depot ({website}), sebab ia diproses, siapa yang menerimanya dan hak anda di bawah Akta Perlindungan Data Peribadi 2010 (PDPA).',
      ],
      sections: [
        { id: 'peranan', title: 'Dua peranan kami', blocks: [
          [
            '**Akaun anda.** Bagi pemilik dan pekerja bengkel yang log masuk, kami ialah pengawal data untuk butiran akaun anda.',
            '**Data yang bengkel masukkan.** Bagi butiran pelanggan dan pekerja yang dimasukkan oleh bengkel, bengkel itu ialah pengawal data. Kami memprosesnya bagi pihak bengkel, mengikut arahan mereka dan Terma Perkhidmatan.',
          ],
          'Jika anda pelanggan atau pekerja sesebuah bengkel, hubungi bengkel itu dahulu tentang data anda. Kami akan membantu bengkel menjawab permintaan anda.',
        ] },
        { id: 'data', title: 'Data yang kami proses', blocks: [
          [
            '**Akaun:** nama dan alamat emel daripada akaun Google anda, dan ID akaun.',
            '**Bengkel:** nama, pautan, telefon, alamat, logo, Instagram dan TikTok, peringkat kerja, tetapan ToyyibPay, status langganan dan rekod bayaran langganan. Kunci Rahsia ToyyibPay disimpan berasingan dan tidak dipaparkan semula.',
            '**Pelanggan bengkel** (dimasukkan oleh bengkel): nama, nombor telefon, emel, nombor plat, kenderaan, butiran kerja dan nota, harga dan bayaran, gambar kerja dan resit bayaran.',
            '**Pekerja bengkel** (dimasukkan oleh bengkel atau pekerja sendiri): nama, No. Kad Pengenalan, telefon, jawatan, gaji, No. KWSP dan PERKESO, nama bank dan nombor akaun, dan slip gaji.',
            '**Bayaran dalam talian:** jumlah, status dan kod bil ToyyibPay. Kami tidak menerima atau menyimpan butiran kad atau akaun bank pembayar; itu diurus oleh ToyyibPay.',
            '**Teknikal:** sesi log masuk dan pilihan anda (bahasa, susun atur menu) disimpan dalam pelayar anda. Penyedia hosting kami menyimpan log pelayan seperti alamat IP dan masa permintaan untuk keselamatan.',
            '**Maklum balas:** apa yang anda tulis dalam laporan masalah yang anda hantar melalui emel kepada kami.',
          ],
        ] },
        { id: 'tujuan', title: 'Sebab kami menggunakannya', blocks: [
          [
            'Menyediakan sistem: rekod kerja, halaman status pelanggan, sebut harga, invois, stok, gaji dan laporan.',
            'Log masuk, keselamatan akaun dan mencegah penyalahgunaan.',
            'Memproses bayaran langganan dan, bagi bengkel yang menetapkan ToyyibPay, bayaran pelanggan mereka.',
            'Menjawab pertanyaan dan aduan, dan memaklumkan perubahan penting pada perkhidmatan.',
            'Mematuhi undang-undang, contohnya menyimpan rekod cukai atau menjawab permintaan pihak berkuasa.',
          ],
          'Kami tidak menjual data peribadi, tidak memaparkan iklan, dan tidak menggunakan penjejak iklan atau analitik.',
        ] },
        { id: 'wajib', title: 'Data wajib dan pilihan', blocks: [
          'Nama dan emel akaun Google anda, dan nama bengkel, diperlukan untuk membuka akaun; tanpanya anda tidak boleh menggunakan sistem. Butiran lain adalah pilihan, tetapi sesetengah ciri memerlukannya (contohnya pengiraan gaji memerlukan gaji pokok, dan butang WhatsApp memerlukan nombor telefon).',
        ] },
        { id: 'penerima', title: 'Siapa yang menerima data', blocks: [
          [
            '**Supabase** menyediakan pangkalan data, storan fail dan log masuk kami. Data disimpan di pusat data di Singapura.',
            '**Google** menguruskan log masuk dengan Google. Fon laman web juga dimuatkan dari Google Fonts, jadi pelayar anda menghantar alamat IP kepada Google.',
            '**ToyyibPay** menerima jumlah dan keterangan setiap bil bayaran. Bayaran pelanggan sesebuah bengkel pergi terus ke akaun ToyyibPay bengkel itu.',
            '**WhatsApp:** apabila anda menekan butang WhatsApp, mesej dibuka dalam WhatsApp anda sendiri. Kami tidak menghantarnya.',
            '**Halaman status pelanggan:** sesiapa yang ada pautan bengkel dan nombor plat atau nombor telefon penuh boleh melihat status kenderaan itu: nama pertama dan huruf awal pemilik, kenderaan, peringkat kerja, harga, nota kerja dan gambar. Nombor telefon disembunyikan kecuali 4 digit terakhir.',
            '**Pihak berkuasa**, apabila dikehendaki oleh undang-undang.',
          ],
        ] },
        { id: 'luar-negara', title: 'Pemindahan ke luar Malaysia', blocks: [
          'Data disimpan di Singapura, yang mempunyai undang-undang perlindungan data peribadinya sendiri, dan Google mungkin memprosesnya di negara lain. Kami hanya menggunakan penyedia yang melindungi data dengan langkah keselamatan yang ketat.',
        ] },
        { id: 'simpan', title: 'Berapa lama kami menyimpannya', blocks: [
          [
            'Selagi akaun bengkel aktif. Bengkel boleh memadam rekod mereka pada bila-bila masa; gambar atau resit yang dipadam dikeluarkan dari storan pada masa itu juga.',
            'Apabila akaun diminta untuk dipadam, kami memadam bengkel itu dan semua datanya dalam masa 30 hari selepas mengesahkan permintaan, kecuali rekod yang wajib disimpan mengikut undang-undang (contohnya rekod bayaran langganan untuk tujuan cukai, sehingga 7 tahun).',
            'Salinan sandaran dipadam mengikut kitaran sandaran penyedia kami.',
          ],
        ] },
        { id: 'keselamatan', title: 'Keselamatan', blocks: [
          [
            'Sambungan disulitkan (HTTPS) dan data disulitkan semasa disimpan.',
            'Setiap bengkel hanya boleh mengakses data sendiri. Pekerja hanya nampak apa yang diperlukan untuk kerja mereka, dan hanya pemilik boleh mengubah gaji.',
            'Tiada sistem yang 100% selamat. Jika berlaku pelanggaran data peribadi, kami akan memaklumkan Pesuruhjaya Perlindungan Data Peribadi dalam masa 72 jam, dan memaklumkan mereka yang terjejas jika ia mungkin menyebabkan kemudaratan, seperti dikehendaki PDPA.',
          ],
        ] },
        { id: 'hak', title: 'Hak anda', blocks: [
          [
            '**Akses:** minta salinan data peribadi anda. Kami akan menjawab dalam masa 21 hari.',
            '**Pembetulan:** betulkan data yang tidak tepat. Kebanyakan butiran boleh diubah terus dalam sistem.',
            '**Tarik balik persetujuan atau hadkan pemprosesan**, termasuk untuk pemasaran langsung. Kami tidak menghantar pemasaran pada masa ini.',
            '**Salinan data:** pemilik bengkel boleh memuat turun semua rekod kerja (CSV) di Tetapan → Data & privasi, dan boleh meminta data lain daripada kami.',
            '**Pemadaman:** minta akaun dan data dipadam di Tetapan → Data & privasi, atau melalui emel.',
            '**Aduan:** hubungi kami dahulu. Anda juga boleh mengadu kepada Jabatan Perlindungan Data Peribadi (pdp.gov.my).',
          ],
          'Untuk menggunakan mana-mana hak ini, emel {email}. Kami mungkin meminta anda mengesahkan identiti anda dahulu.',
        ] },
        { id: 'kuki', title: 'Kuki dan storan pelayar', blocks: [
          'Kami tidak menggunakan kuki iklan atau analitik. Pelayar anda menyimpan sesi log masuk dan pilihan anda (bahasa, susun atur menu, panduan permulaan) supaya sistem berfungsi. Anda boleh memadamnya dengan log keluar atau mengosongkan data laman dalam pelayar.',
        ] },
        { id: 'kanak-kanak', title: 'Kanak-kanak', blocks: [
          'Digital Depot ialah perkhidmatan untuk perniagaan dan tidak ditujukan kepada sesiapa di bawah umur 18 tahun.',
        ] },
        { id: 'perubahan', title: 'Perubahan notis ini', blocks: [
          'Apabila notis ini berubah, kami mengemas kini tarikh di atas dan memaklumkan perubahan penting dalam sistem.',
        ] },
        { id: 'bahasa', title: 'Bahasa', blocks: [
          'Notis ini disediakan dalam Bahasa Melayu dan Bahasa Inggeris. Jika terdapat percanggahan, versi Bahasa Melayu diguna pakai.',
        ] },
      ],
    },
    en: {
      title: 'Privacy Notice',
      intro: [
        'This notice explains what personal data Digital Depot ({website}) processes, why, who receives it, and your rights under the Personal Data Protection Act 2010 (PDPA).',
      ],
      sections: [
        { id: 'peranan', title: 'Our two roles', blocks: [
          [
            '**Your account.** For workshop owners and staff who sign in, we are the data controller for your account details.',
            '**Data a workshop enters.** For details of customers and employees entered by a workshop, the workshop is the data controller. We process that data on the workshop\'s behalf, following its instructions and the Terms of Service.',
          ],
          'If you are a customer or employee of a workshop, contact that workshop first about your data. We will help the workshop answer your request.',
        ] },
        { id: 'data', title: 'The data we process', blocks: [
          [
            '**Account:** the name and email address of your Google account, and an account ID.',
            '**Workshop:** name, link, phone, address, logo, Instagram and TikTok, job stages, ToyyibPay settings, subscription status and subscription payment records. The ToyyibPay Secret Key is stored separately and never shown again.',
            '**Workshop customers** (entered by the workshop): name, phone number, email, plate number, vehicle, job details and notes, prices and payments, job photos and payment receipts.',
            '**Workshop employees** (entered by the workshop or the employee): name, IC number, phone, position, salary, EPF and SOCSO numbers, bank name and account number, and payslips.',
            '**Online payments:** amount, status and ToyyibPay bill code. We never receive or store the payer\'s card or bank account details; ToyyibPay handles those.',
            '**Technical:** your sign-in session and preferences (language, menu layout) are kept in your browser. Our hosting provider keeps server logs such as IP addresses and request times for security.',
            '**Feedback:** whatever you write in a problem report you email to us.',
          ],
        ] },
        { id: 'tujuan', title: 'Why we use it', blocks: [
          [
            'To provide the system: job records, the customer status page, quotations, invoices, stock, payroll and reports.',
            'Sign-in, account security and preventing misuse.',
            'Processing subscription payments and, for workshops that set up ToyyibPay, their customers\' payments.',
            'Answering questions and complaints, and telling you about important changes to the service.',
            'Complying with the law, for example keeping tax records or answering requests from authorities.',
          ],
          'We do not sell personal data, show ads, or use advertising or analytics trackers.',
        ] },
        { id: 'wajib', title: 'Required and optional data', blocks: [
          'Your Google account name and email, and a workshop name, are needed to open an account; without them you cannot use the system. Other details are optional, but some features need them (for example payroll needs a basic salary, and the WhatsApp button needs a phone number).',
        ] },
        { id: 'penerima', title: 'Who receives data', blocks: [
          [
            '**Supabase** provides our database, file storage and sign-in. Data is stored in data centres in Singapore.',
            '**Google** handles Sign in with Google. The website\'s fonts are also loaded from Google Fonts, so your browser sends its IP address to Google.',
            '**ToyyibPay** receives the amount and description of each payment bill. A workshop\'s customer payments go straight to that workshop\'s own ToyyibPay account.',
            '**WhatsApp:** when you press a WhatsApp button, the message opens in your own WhatsApp. We do not send it.',
            '**Customer status page:** anyone with a workshop\'s link and a full plate number or phone number can see that vehicle\'s status: the owner\'s first name and initial, vehicle, job stage, prices, job notes and photos. Phone numbers are hidden except the last 4 digits.',
            '**Authorities**, when the law requires it.',
          ],
        ] },
        { id: 'luar-negara', title: 'Transfers outside Malaysia', blocks: [
          'Data is stored in Singapore, which has its own personal data protection law, and Google may process it in other countries. We only use providers that protect data with strict security measures.',
        ] },
        { id: 'simpan', title: 'How long we keep it', blocks: [
          [
            'For as long as the workshop account is active. Workshops can delete their records at any time; deleted photos and receipts are removed from storage at the same time.',
            'When an account is to be deleted, we delete the workshop and all its data within 30 days of confirming the request, except records the law requires us to keep (for example subscription payment records for tax purposes, for up to 7 years).',
            'Backup copies are deleted on our providers\' backup cycle.',
          ],
        ] },
        { id: 'keselamatan', title: 'Security', blocks: [
          [
            'Connections are encrypted (HTTPS) and data is encrypted at rest.',
            'Each workshop can only access its own data. Staff only see what their work needs, and only the owner can change salaries.',
            'No system is 100% secure. If a personal data breach happens, we will notify the Personal Data Protection Commissioner within 72 hours, and tell those affected if it is likely to cause them harm, as the PDPA requires.',
          ],
        ] },
        { id: 'hak', title: 'Your rights', blocks: [
          [
            '**Access:** ask for a copy of your personal data. We will reply within 21 days.',
            '**Correction:** correct inaccurate data. Most details can be changed directly in the system.',
            '**Withdraw consent or limit processing**, including for direct marketing. We do not send marketing at the moment.',
            '**A copy of your data:** workshop owners can download all job records (CSV) under Settings → Data & privacy, and can ask us for other data.',
            '**Deletion:** ask for your account and data to be deleted under Settings → Data & privacy, or by email.',
            '**Complaints:** contact us first. You can also complain to the Personal Data Protection Department (pdp.gov.my).',
          ],
          'To use any of these rights, email {email}. We may ask you to confirm your identity first.',
        ] },
        { id: 'kuki', title: 'Cookies and browser storage', blocks: [
          'We do not use advertising or analytics cookies. Your browser stores your sign-in session and preferences (language, menu layout, getting-started guide) so the system works. You can clear them by signing out or clearing the site\'s data in your browser.',
        ] },
        { id: 'kanak-kanak', title: 'Children', blocks: [
          'Digital Depot is a service for businesses and is not meant for anyone under 18.',
        ] },
        { id: 'perubahan', title: 'Changes to this notice', blocks: [
          'When this notice changes, we update the date above and tell you about important changes in the system.',
        ] },
        { id: 'bahasa', title: 'Language', blocks: [
          'This notice is in Bahasa Melayu and English. If the two differ, the Bahasa Melayu version applies.',
        ] },
      ],
    },
  },

  terms: {
    ms: {
      title: 'Terma Perkhidmatan',
      intro: [
        'Terma ini ialah perjanjian antara anda dan Digital Depot ({website}). Dengan mendaftar atau menggunakan sistem, anda bersetuju dengan terma ini dan Notis Privasi.',
      ],
      sections: [
        { id: 'akaun', title: 'Siapa boleh menggunakan dan akaun', blocks: [
          [
            'Anda mesti berumur 18 tahun ke atas. Jika anda mendaftar untuk sebuah bengkel, anda mesti mempunyai kuasa untuk bertindak bagi bengkel itu.',
            'Log masuk adalah melalui akaun Google. Jaga akaun anda; anda bertanggungjawab atas aktiviti dalam akaun bengkel anda, termasuk pekerja yang anda jemput. Maklumkan kami segera jika ada akses tanpa kebenaran.',
          ],
        ] },
        { id: 'perkhidmatan', title: 'Perkhidmatan', blocks: [
          'Digital Depot ialah sistem pengurusan bengkel dalam talian: rekod kerja, halaman status pelanggan, sebut harga, invois, stok, pekerja dan gaji, dan laporan. Kami terus menambah baik sistem, jadi ciri boleh berubah dari semasa ke semasa. Sila laporkan sebarang masalah kepada kami.',
        ] },
        { id: 'harga', title: 'Pelan dan harga', blocks: [
          [
            '**Percubaan percuma 14 hari**, dengan had 30 kerja aktif, 1 akaun pekerja dan 20 item inventori. Tiada kad diperlukan.',
            '**Early bird** (10 bengkel pertama): percuma 12 bulan, kemudian RM20 sebulan atau RM200 setahun. Harga early bird kekal untuk bengkel itu selagi langganannya diperbaharui tanpa terputus lebih daripada 30 hari.',
            '**Pro:** RM30 sebulan atau RM300 setahun, tanpa had kerja, pekerja atau inventori.',
          ],
          'Harga dalam Ringgit Malaysia ialah jumlah penuh yang anda bayar; tiada caj tambahan. Kami akan memberi notis sekurang-kurangnya 30 hari sebelum mengubah harga, dan perubahan hanya terpakai mulai tempoh langganan anda yang seterusnya.',
        ] },
        { id: 'bayaran', title: 'Bayaran', blocks: [
          [
            'Langganan dibayar terlebih dahulu, untuk sebulan atau setahun, melalui ToyyibPay (FPX atau kad). Langganan aktif sebaik sahaja bayaran disahkan.',
            'Tiada pembaharuan automatik: langganan hanya diteruskan jika anda membayar untuk tempoh seterusnya.',
            'Jika percubaan atau langganan tamat, anda masih boleh membuka dan mengurus rekod sedia ada tetapi tidak boleh menambah kerja baharu sehingga anda memperbaharui. Data anda tidak dipadam kerana langganan tamat.',
          ],
        ] },
        { id: 'bayaran-balik', title: 'Bayaran balik', blocks: [
          [
            'Yuran langganan tidak dikembalikan untuk baki tempoh yang tidak digunakan jika anda berhenti menggunakan sistem.',
            'Bayaran berganda atau caj yang salah akan dipulangkan sepenuhnya jika dilaporkan kepada kami dalam masa 14 hari, ke kaedah bayaran asal.',
            'Jika kami menamatkan perkhidmatan tanpa kesalahan anda, kami memulangkan bahagian yuran bagi tempoh yang belum digunakan.',
          ],
          'Hak anda di bawah undang-undang perlindungan pengguna Malaysia tidak terjejas.',
        ] },
        { id: 'bayaran-pelanggan', title: 'Bayaran daripada pelanggan anda', blocks: [
          'Jika anda menetapkan ToyyibPay, bayaran pelanggan anda pergi terus ke akaun ToyyibPay anda sendiri, di bawah terma ToyyibPay. Digital Depot bukan pihak kepada transaksi itu, tidak memegang wang itu, dan tidak menguruskan bayaran balik atau caj balik bagi pihak anda. Yuran ToyyibPay dikenakan pada akaun anda.',
        ] },
        { id: 'tanggungjawab', title: 'Tanggungjawab anda', blocks: [
          [
            'Pastikan data yang anda masukkan tepat dan anda berhak menggunakannya.',
            'Anda ialah pengawal data bagi pelanggan dan pekerja anda. Maklumkan mereka bahawa butiran mereka direkodkan dalam sistem pengurusan bengkel, dan bahawa status kerja kenderaan boleh dilihat di halaman status anda.',
            'Halaman status menunjukkan nota kerja dan gambar kepada sesiapa yang ada pautan bengkel anda dan nombor plat atau telefon penuh. Jangan tulis maklumat sensitif dalam nota kerja.',
            'Gaji: sistem mengira caruman KWSP, PERKESO dan SIP mengikut jadual rasmi untuk pekerja warganegara dan PR, sebagai bantuan. Anda bertanggungjawab menyemak setiap amaun (termasuk kadar pekerja asing dan PCB) sebelum membayar gaji atau menghantar caruman kepada KWSP, PERKESO dan LHDN.',
            'Patuhi undang-undang yang terpakai pada perniagaan anda.',
          ],
        ] },
        { id: 'pemprosesan', title: 'Data yang kami proses untuk anda', blocks: [
          'Bagi data pelanggan dan pekerja yang anda masukkan, kami:',
          [
            'memprosesnya hanya untuk menyediakan perkhidmatan dan mengikut arahan anda;',
            'menjaga kerahsiaannya dan menggunakan langkah keselamatan yang munasabah;',
            'hanya menggunakan penyedia yang disenaraikan dalam Notis Privasi;',
            'membantu anda menjawab permintaan akses, pembetulan dan pemadaman;',
            'memaklumkan anda tanpa kelewatan yang tidak wajar jika berlaku pelanggaran data; dan',
            'memadam data apabila akaun ditutup, selepas memberi anda peluang untuk mengeksportnya.',
          ],
        ] },
        { id: 'larangan', title: 'Penggunaan yang dilarang', blocks: [
          'Jangan cuba mengakses data bengkel lain, mengganggu atau membebankan sistem, menggunakannya untuk aktiviti haram atau penipuan, memuat naik kandungan yang melanggar hak orang lain, atau menyalin dan menjual semula perkhidmatan. Kami boleh menggantung akaun yang melanggar terma ini.',
        ] },
        { id: 'hak-milik', title: 'Hak milik', blocks: [
          'Kami memiliki perisian Digital Depot. Anda memiliki data bengkel anda, dan memberi kami kebenaran untuk menyimpan dan memprosesnya hanya untuk menyediakan perkhidmatan kepada anda.',
        ] },
        { id: 'liabiliti', title: 'Ketersediaan dan liabiliti', blocks: [
          'Kami berusaha memastikan sistem sentiasa tersedia dan data selamat, tetapi perkhidmatan disediakan "seadanya", tanpa jaminan bahawa ia tidak akan terganggu. Simpan salinan rekod penting (contohnya eksport CSV).',
          'Setakat yang dibenarkan undang-undang, kami tidak bertanggungjawab atas kerugian tidak langsung atau kehilangan keuntungan, dan jumlah liabiliti kami terhad kepada yang lebih tinggi antara yuran yang anda bayar kepada kami dalam 12 bulan sebelum tuntutan, atau RM100. Tiada apa-apa dalam terma ini mengehadkan liabiliti yang tidak boleh dihadkan di sisi undang-undang.',
        ] },
        { id: 'penamatan', title: 'Penamatan', blocks: [
          [
            'Anda boleh berhenti pada bila-bila masa dan meminta akaun dipadam di Tetapan → Data & privasi. Eksport data anda dahulu.',
            'Kami boleh menggantung atau menamatkan akaun yang melanggar terma ini, atau menamatkan perkhidmatan dengan notis sekurang-kurangnya 30 hari. Anda akan diberi peluang untuk mengeksport data anda sebelum ia dipadam.',
          ],
        ] },
        { id: 'perubahan', title: 'Perubahan terma', blocks: [
          'Kami akan memaklumkan perubahan penting dalam sistem sekurang-kurangnya 14 hari sebelum ia berkuat kuasa. Jika anda terus menggunakan sistem selepas itu, anda bersetuju dengan terma yang baharu.',
        ] },
        { id: 'undang-undang', title: 'Undang-undang', blocks: [
          'Terma ini tertakluk kepada undang-undang Malaysia, dan mahkamah Malaysia mempunyai bidang kuasa. Terma ini disediakan dalam Bahasa Melayu dan Bahasa Inggeris; jika terdapat percanggahan, versi Bahasa Melayu diguna pakai.',
        ] },
      ],
    },
    en: {
      title: 'Terms of Service',
      intro: [
        'These terms are an agreement between you and Digital Depot ({website}). By signing up for or using the system, you agree to these terms and the Privacy Notice.',
      ],
      sections: [
        { id: 'akaun', title: 'Who can use it, and accounts', blocks: [
          [
            'You must be 18 or older. If you sign up for a workshop, you must have authority to act for that workshop.',
            'Sign-in is through a Google account. Keep your account secure; you are responsible for activity in your workshop\'s account, including staff you invite. Tell us straight away about any unauthorised access.',
          ],
        ] },
        { id: 'perkhidmatan', title: 'The service', blocks: [
          'Digital Depot is an online workshop management system: job records, a customer status page, quotations, invoices, stock, staff and payroll, and reports. We keep improving the system, so features may change over time. Please report any problems to us.',
        ] },
        { id: 'harga', title: 'Plans and prices', blocks: [
          [
            '**14-day free trial**, limited to 30 active jobs, 1 staff account and 20 inventory items. No card needed.',
            '**Early bird** (first 10 workshops): free for 12 months, then RM20 a month or RM200 a year. The early-bird price stays for that workshop as long as its subscription is renewed without a gap of more than 30 days.',
            '**Pro:** RM30 a month or RM300 a year, with no limit on jobs, staff or inventory.',
          ],
          'Prices in Malaysian Ringgit are the full amount you pay; there are no extra charges. We will give at least 30 days\' notice before changing prices, and changes only apply from your next subscription period.',
        ] },
        { id: 'bayaran', title: 'Payment', blocks: [
          [
            'Subscriptions are paid in advance, for a month or a year, through ToyyibPay (FPX or card). A subscription is active as soon as the payment is confirmed.',
            'There is no automatic renewal: a subscription only continues if you pay for the next period.',
            'If a trial or subscription ends, you can still open and manage existing records but cannot add new jobs until you renew. Your data is not deleted because a subscription ended.',
          ],
        ] },
        { id: 'bayaran-balik', title: 'Refunds', blocks: [
          [
            'Subscription fees are not refunded for the unused part of a period if you stop using the system.',
            'Duplicate payments or wrong charges are refunded in full if reported to us within 14 days, to the original payment method.',
            'If we end the service through no fault of yours, we refund the fees for the unused period.',
          ],
          'Your rights under Malaysian consumer protection law are not affected.',
        ] },
        { id: 'bayaran-pelanggan', title: 'Payments from your customers', blocks: [
          'If you set up ToyyibPay, your customers\' payments go straight to your own ToyyibPay account, under ToyyibPay\'s terms. Digital Depot is not a party to those transactions, does not hold the money, and does not handle refunds or chargebacks for you. ToyyibPay\'s fees are charged to your account.',
        ] },
        { id: 'tanggungjawab', title: 'Your responsibilities', blocks: [
          [
            'Make sure the data you enter is accurate and that you are entitled to use it.',
            'You are the data controller for your customers and employees. Tell them that their details are recorded in a workshop management system, and that their vehicle\'s job status can be seen on your status page.',
            'The status page shows job notes and photos to anyone with your workshop\'s link and a full plate or phone number. Do not write sensitive information in job notes.',
            'Payroll: the system works out KWSP, PERKESO and SIP contributions from the official schedules for citizens and PRs, as an aid. You are responsible for checking every amount (including foreign workers\' rates and PCB) before paying salaries or submitting contributions to KWSP, PERKESO and LHDN.',
            'Follow the laws that apply to your business.',
          ],
        ] },
        { id: 'pemprosesan', title: 'Data we process for you', blocks: [
          'For the customer and employee data you enter, we:',
          [
            'process it only to provide the service and as you instruct;',
            'keep it confidential and use reasonable security measures;',
            'only use the providers listed in the Privacy Notice;',
            'help you answer access, correction and deletion requests;',
            'tell you without undue delay about a data breach; and',
            'delete it when the account is closed, after giving you a chance to export it.',
          ],
        ] },
        { id: 'larangan', title: 'What you must not do', blocks: [
          'Do not try to access other workshops\' data, disrupt or overload the system, use it for anything illegal or fraudulent, upload content that infringes others\' rights, or copy and resell the service. We may suspend accounts that break these terms.',
        ] },
        { id: 'hak-milik', title: 'Ownership', blocks: [
          'We own the Digital Depot software. You own your workshop\'s data, and allow us to store and process it only to provide the service to you.',
        ] },
        { id: 'liabiliti', title: 'Availability and liability', blocks: [
          'We work to keep the system available and data safe, but the service is provided "as is", without a promise that it will never be interrupted. Keep copies of important records (for example the CSV export).',
          'As far as the law allows, we are not liable for indirect losses or lost profits, and our total liability is limited to the greater of the fees you paid us in the 12 months before the claim, or RM100. Nothing in these terms limits liability that cannot be limited by law.',
        ] },
        { id: 'penamatan', title: 'Ending the service', blocks: [
          [
            'You can stop at any time and ask for your account to be deleted under Settings → Data & privacy. Export your data first.',
            'We may suspend or close accounts that break these terms, or end the service with at least 30 days\' notice. You will have a chance to export your data before it is deleted.',
          ],
        ] },
        { id: 'perubahan', title: 'Changes to these terms', blocks: [
          'We will tell you about important changes in the system at least 14 days before they take effect. If you keep using the system after that, you accept the new terms.',
        ] },
        { id: 'undang-undang', title: 'Governing law', blocks: [
          'These terms are governed by Malaysian law, and the courts of Malaysia have jurisdiction. They are in Bahasa Melayu and English; if the two differ, the Bahasa Melayu version applies.',
        ] },
      ],
    },
  },
}

// Fill in {email} and {website}.
export const fillLegal = (text, business) =>
  text.replace(/\{email\}/g, business.email).replace(/\{website\}/g, business.website)
