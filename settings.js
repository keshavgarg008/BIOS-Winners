/* JeevanSetu – language + text-size settings (no dependencies, saved in localStorage) */
(function () {
  "use strict";

  var T = {
    en: {
      nav_register: "Register",
      register_btn: "Register now",
      uid_label: "Unique ID",
      uid_ph: "For example, GS-P-7K3Q-9XMD",
      uid_hint: "You get this ID when you register. It opens the right page for you.",
      password: "Password",
      new_here: "New here?",
      register_link: "Register",
      reg_title: "Register",
      reg_lead: "Create your account. You will get a unique ID to sign in with.",
      reg_as: "I am registering as",
      full_name: "Full name",
      place_default: "Village, clinic or school",
      place_parent: "Village or town",
      place_asha: "Health centre or village",
      place_doctor: "Clinic name",
      place_teacher: "School name",
      create_pw: "Create a password",
      pw_hint: "At least 6 characters.",
      confirm_pw: "Confirm password",
      register_submit: "Register",
      have_account: "Already registered?",
      signin_link: "Sign in",
      ok_title: "You are registered",
      ok_id_is: "Your unique ID is:",
      copy: "Copy ID",
      copied: "Copied",
      copy_manual: "Select the ID and copy it by hand.",
      ok_note: "Write this ID down. Next time, enter it with your password on the sign-in page and you will go straight to your own page.",
      go_page: "Go to my page",
      err_uid: "Enter your unique ID.",
      err_pw: "Enter your password.",
      err_bad: "The ID or password is not correct. Check them and try again.",
      err_role: "Choose who you are registering as.",
      err_name: "Enter your full name.",
      err_mobile: "Enter a valid 10-digit mobile number.",
      err_place: "Enter your village, clinic or school name.",
      err_pw_len: "Your password needs at least 6 characters.",
      err_pw_match: "The two passwords do not match.",
      err_dup: "This mobile number is already registered for this role. Sign in with your unique ID instead.",
      err_storage: "This browser is blocking storage, so the account could not be saved. Open the site with Chrome or from a local server."
    },
    hi: {
      skip: "मुख्य सामग्री पर जाएँ",
      tagline: "बच्चों के टीकाकरण और विकास के रिकॉर्ड",
      nav_home: "होम", nav_roles: "यह किनके लिए है", nav_about: "हमारे बारे में",
      hero_title: "हर बच्चे के टीके और विकास के पड़ाव, सही राह पर।",
      hero_text: "यह देखने के लिए साइन इन करें कि कौन से टीके बाकी हैं, मुलाकातें दर्ज करें, और हर बच्चे का रिकॉर्ड एक जगह रखें। नेटवर्क न होने पर भी काम करने के लिए बनाया गया।",
      signin: "साइन इन", i_am: "मैं हूँ",
      role_parent: "अभिभावक", role_asha: "आशा कार्यकर्ता", role_doctor: "डॉक्टर", role_teacher: "शिक्षक",
      mobile: "मोबाइल नंबर", mobile_ph: "10 अंकों का मोबाइल नंबर",
      signin_btn: "साइन इन करें",
      roles_title: "यह किनके लिए है",
      card_parent_h: "अभिभावक", card_parent_p: "अपने बच्चे के स्वास्थ्य रिकॉर्ड, शैक्षणिक रिकॉर्ड, टीकाकरण कार्यक्रम और अनुस्मारक देखें।",
      card_asha_h: "आशा कार्यकर्ता", card_asha_p: "आज किससे मिलना है, यह देखें और फ़ील्ड में टीके व जाँच दर्ज करें।",
      card_doctor_h: "डॉक्टर", card_doctor_p: "क्लिनिक के रिकॉर्ड देखें और परस्पर विरोधी प्रविष्टियों का समाधान करें।",
      card_teacher_h: "शिक्षक", card_teacher_p: "स्कूल में स्वास्थ्य जाँच में सहयोग करें और परिणाम परिवारों के साथ साझा करें।",
      about_title: "गाँव सेतु के बारे में",
      about_text: "गाँव सेतु एक ऑफ़लाइन-फ़र्स्ट बाल कल्याण रिकॉर्ड प्रबंधन ऐप है, जो क्लिनिकों, सामुदायिक स्वास्थ्य कार्यकर्ताओं और स्कूलों को बिना इंटरनेट के बच्चों के रिकॉर्ड सँभालने और देखने में मदद करता है। हर डिवाइस रिकॉर्ड स्थानीय रूप से सहेजता है, जिससे उपयोगकर्ता स्वतंत्र रूप से काम जारी रख सकते हैं। डिवाइस के दोबारा जुड़ने पर बदलाव सिंक होकर सुरक्षित रूप से मर्ज हो जाते हैं, ताकि कोई भी महत्वपूर्ण जानकारी चुपचाप खो न जाए।",
      footer: "जीवनसेतु द्वारा ♡ के साथ बनाया गया",
      nav_register: "पंजीकरण",
      register_btn: "अभी पंजीकरण करें",
      uid_label: "यूनिक आईडी",
      uid_ph: "उदाहरण: GS-P-7K3Q-9XMD",
      uid_hint: "यह आईडी आपको पंजीकरण करने पर मिलती है। यह आपका सही पेज खोलती है।",
      password: "पासवर्ड",
      new_here: "नए हैं?",
      register_link: "पंजीकरण करें",
      reg_title: "पंजीकरण",
      reg_lead: "अपना खाता बनाएँ। साइन इन के लिए आपको एक यूनिक आईडी मिलेगी।",
      reg_as: "मैं पंजीकरण कर रहा/रही हूँ",
      full_name: "पूरा नाम",
      place_default: "गाँव, क्लिनिक या स्कूल",
      place_parent: "गाँव या शहर",
      place_asha: "स्वास्थ्य केंद्र या गाँव",
      place_doctor: "क्लिनिक का नाम",
      place_teacher: "स्कूल का नाम",
      create_pw: "पासवर्ड बनाएँ",
      pw_hint: "कम से कम 6 अक्षर।",
      confirm_pw: "पासवर्ड दोबारा लिखें",
      register_submit: "पंजीकरण करें",
      have_account: "पहले से पंजीकृत हैं?",
      signin_link: "साइन इन",
      ok_title: "आपका पंजीकरण हो गया",
      ok_id_is: "आपकी यूनिक आईडी है:",
      copy: "आईडी कॉपी करें",
      copied: "कॉपी हो गया",
      copy_manual: "आईडी चुनकर हाथ से कॉपी करें।",
      ok_note: "इस आईडी को लिख लें। अगली बार साइन इन पेज पर इसे पासवर्ड के साथ डालें, आप सीधे अपने पेज पर पहुँच जाएँगे।",
      go_page: "मेरे पेज पर जाएँ",
      err_uid: "अपनी यूनिक आईडी डालें।",
      err_pw: "अपना पासवर्ड डालें।",
      err_bad: "आईडी या पासवर्ड सही नहीं है। जाँचकर फिर कोशिश करें।",
      err_role: "चुनें कि आप किस रूप में पंजीकरण कर रहे हैं।",
      err_name: "अपना पूरा नाम डालें।",
      err_mobile: "10 अंकों का सही मोबाइल नंबर डालें।",
      err_place: "अपने गाँव, क्लिनिक या स्कूल का नाम डालें।",
      err_pw_len: "पासवर्ड कम से कम 6 अक्षर का होना चाहिए।",
      err_pw_match: "दोनों पासवर्ड मेल नहीं खाते।",
      err_dup: "यह मोबाइल नंबर इस भूमिका के लिए पहले से पंजीकृत है। अपनी यूनिक आईडी से साइन इन करें।",
      err_storage: "यह ब्राउज़र स्टोरेज रोक रहा है, इसलिए खाता सहेजा नहीं जा सका। साइट को Chrome में या लोकल सर्वर से खोलें।"
    },
    pa: {
      skip: "ਮੁੱਖ ਸਮੱਗਰੀ 'ਤੇ ਜਾਓ",
      tagline: "ਬੱਚਿਆਂ ਦੇ ਟੀਕਾਕਰਨ ਅਤੇ ਵਿਕਾਸ ਦੇ ਰਿਕਾਰਡ",
      nav_home: "ਮੁੱਖ ਪੰਨਾ", nav_roles: "ਇਹ ਕਿਨ੍ਹਾਂ ਲਈ ਹੈ", nav_about: "ਸਾਡੇ ਬਾਰੇ",
      hero_title: "ਹਰ ਬੱਚੇ ਦੇ ਟੀਕੇ ਅਤੇ ਵਿਕਾਸ ਦੇ ਪੜਾਅ, ਸਹੀ ਰਾਹ 'ਤੇ।",
      hero_text: "ਇਹ ਵੇਖਣ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ ਕਿ ਕਿਹੜੇ ਟੀਕੇ ਬਾਕੀ ਹਨ, ਮੁਲਾਕਾਤਾਂ ਦਰਜ ਕਰੋ, ਅਤੇ ਹਰ ਬੱਚੇ ਦਾ ਰਿਕਾਰਡ ਇੱਕ ਥਾਂ ਰੱਖੋ। ਨੈੱਟਵਰਕ ਨਾ ਹੋਣ 'ਤੇ ਵੀ ਕੰਮ ਕਰਨ ਲਈ ਬਣਾਇਆ ਗਿਆ।",
      signin: "ਸਾਈਨ ਇਨ", i_am: "ਮੈਂ ਹਾਂ",
      role_parent: "ਮਾਪੇ", role_asha: "ਆਸ਼ਾ ਵਰਕਰ", role_doctor: "ਡਾਕਟਰ", role_teacher: "ਅਧਿਆਪਕ",
      mobile: "ਮੋਬਾਈਲ ਨੰਬਰ", mobile_ph: "10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ",
      signin_btn: "ਸਾਈਨ ਇਨ ਕਰੋ",
      roles_title: "ਇਹ ਕਿਨ੍ਹਾਂ ਲਈ ਹੈ",
      card_parent_h: "ਮਾਪੇ", card_parent_p: "ਆਪਣੇ ਬੱਚੇ ਦੇ ਸਿਹਤ ਰਿਕਾਰਡ, ਅਕਾਦਮਿਕ ਰਿਕਾਰਡ, ਟੀਕਾਕਰਨ ਸਮਾਂ-ਸਾਰਣੀ ਅਤੇ ਯਾਦ-ਦਹਾਨੀਆਂ ਵੇਖੋ।",
      card_asha_h: "ਆਸ਼ਾ ਵਰਕਰ", card_asha_p: "ਅੱਜ ਕਿਸ ਨੂੰ ਮਿਲਣਾ ਹੈ, ਇਹ ਵੇਖੋ ਅਤੇ ਖੇਤਰ ਵਿੱਚ ਟੀਕੇ ਤੇ ਜਾਂਚਾਂ ਦਰਜ ਕਰੋ।",
      card_doctor_h: "ਡਾਕਟਰ", card_doctor_p: "ਕਲੀਨਿਕ ਦੇ ਰਿਕਾਰਡ ਵੇਖੋ ਅਤੇ ਆਪਸ ਵਿੱਚ ਟਕਰਾਉਂਦੀਆਂ ਐਂਟਰੀਆਂ ਦਾ ਹੱਲ ਕਰੋ।",
      card_teacher_h: "ਅਧਿਆਪਕ", card_teacher_p: "ਸਕੂਲ ਵਿੱਚ ਸਿਹਤ ਜਾਂਚਾਂ ਵਿੱਚ ਸਹਿਯੋਗ ਕਰੋ ਅਤੇ ਨਤੀਜੇ ਪਰਿਵਾਰਾਂ ਨਾਲ ਸਾਂਝੇ ਕਰੋ।",
      about_title: "ਗਾਓਂ ਸੇਤੂ ਬਾਰੇ",
      about_text: "ਗਾਓਂ ਸੇਤੂ ਇੱਕ ਔਫਲਾਈਨ-ਫਸਟ ਬਾਲ ਭਲਾਈ ਰਿਕਾਰਡ ਪ੍ਰਬੰਧਨ ਐਪ ਹੈ, ਜੋ ਕਲੀਨਿਕਾਂ, ਭਾਈਚਾਰਕ ਸਿਹਤ ਵਰਕਰਾਂ ਅਤੇ ਸਕੂਲਾਂ ਨੂੰ ਇੰਟਰਨੈੱਟ ਤੋਂ ਬਿਨਾਂ ਬੱਚਿਆਂ ਦੇ ਰਿਕਾਰਡ ਸੰਭਾਲਣ ਅਤੇ ਵੇਖਣ ਵਿੱਚ ਮਦਦ ਕਰਦੀ ਹੈ। ਹਰ ਡਿਵਾਈਸ ਰਿਕਾਰਡ ਸਥਾਨਕ ਤੌਰ 'ਤੇ ਸੰਭਾਲਦੀ ਹੈ, ਜਿਸ ਨਾਲ ਵਰਤੋਂਕਾਰ ਆਜ਼ਾਦ ਤੌਰ 'ਤੇ ਕੰਮ ਜਾਰੀ ਰੱਖ ਸਕਦੇ ਹਨ। ਡਿਵਾਈਸਾਂ ਦੇ ਮੁੜ ਜੁੜਨ 'ਤੇ ਤਬਦੀਲੀਆਂ ਸਿੰਕ ਹੋ ਕੇ ਸੁਰੱਖਿਅਤ ਢੰਗ ਨਾਲ ਮਿਲਾ ਦਿੱਤੀਆਂ ਜਾਂਦੀਆਂ ਹਨ, ਤਾਂ ਜੋ ਕੋਈ ਵੀ ਜ਼ਰੂਰੀ ਜਾਣਕਾਰੀ ਚੁੱਪਚਾਪ ਗੁੰਮ ਨਾ ਹੋਵੇ।",
      footer: "ਜੀਵਨਸੇਤੂ ਵੱਲੋਂ ♡ ਨਾਲ ਬਣਾਇਆ ਗਿਆ",
      nav_register: "ਰਜਿਸਟ੍ਰੇਸ਼ਨ",
      register_btn: "ਹੁਣੇ ਰਜਿਸਟਰ ਕਰੋ",
      uid_label: "ਯੂਨੀਕ ਆਈਡੀ",
      uid_ph: "ਉਦਾਹਰਨ: GS-P-7K3Q-9XMD",
      uid_hint: "ਇਹ ਆਈਡੀ ਤੁਹਾਨੂੰ ਰਜਿਸਟਰ ਕਰਨ 'ਤੇ ਮਿਲਦੀ ਹੈ। ਇਹ ਤੁਹਾਡਾ ਸਹੀ ਪੰਨਾ ਖੋਲ੍ਹਦੀ ਹੈ।",
      password: "ਪਾਸਵਰਡ",
      new_here: "ਨਵੇਂ ਹੋ?",
      register_link: "ਰਜਿਸਟਰ ਕਰੋ",
      reg_title: "ਰਜਿਸਟ੍ਰੇਸ਼ਨ",
      reg_lead: "ਆਪਣਾ ਖਾਤਾ ਬਣਾਓ। ਸਾਈਨ ਇਨ ਲਈ ਤੁਹਾਨੂੰ ਇੱਕ ਯੂਨੀਕ ਆਈਡੀ ਮਿਲੇਗੀ।",
      reg_as: "ਮੈਂ ਰਜਿਸਟਰ ਕਰ ਰਿਹਾ/ਰਹੀ ਹਾਂ",
      full_name: "ਪੂਰਾ ਨਾਮ",
      place_default: "ਪਿੰਡ, ਕਲੀਨਿਕ ਜਾਂ ਸਕੂਲ",
      place_parent: "ਪਿੰਡ ਜਾਂ ਸ਼ਹਿਰ",
      place_asha: "ਸਿਹਤ ਕੇਂਦਰ ਜਾਂ ਪਿੰਡ",
      place_doctor: "ਕਲੀਨਿਕ ਦਾ ਨਾਮ",
      place_teacher: "ਸਕੂਲ ਦਾ ਨਾਮ",
      create_pw: "ਪਾਸਵਰਡ ਬਣਾਓ",
      pw_hint: "ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰ।",
      confirm_pw: "ਪਾਸਵਰਡ ਦੁਬਾਰਾ ਲਿਖੋ",
      register_submit: "ਰਜਿਸਟਰ ਕਰੋ",
      have_account: "ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰ ਹੋ?",
      signin_link: "ਸਾਈਨ ਇਨ",
      ok_title: "ਤੁਹਾਡੀ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਹੋ ਗਈ",
      ok_id_is: "ਤੁਹਾਡੀ ਯੂਨੀਕ ਆਈਡੀ ਹੈ:",
      copy: "ਆਈਡੀ ਕਾਪੀ ਕਰੋ",
      copied: "ਕਾਪੀ ਹੋ ਗਈ",
      copy_manual: "ਆਈਡੀ ਚੁਣ ਕੇ ਹੱਥੀਂ ਕਾਪੀ ਕਰੋ।",
      ok_note: "ਇਹ ਆਈਡੀ ਲਿਖ ਲਓ। ਅਗਲੀ ਵਾਰ ਸਾਈਨ ਇਨ ਪੰਨੇ 'ਤੇ ਇਹ ਪਾਸਵਰਡ ਨਾਲ ਪਾਓ, ਤੁਸੀਂ ਸਿੱਧੇ ਆਪਣੇ ਪੰਨੇ 'ਤੇ ਪਹੁੰਚ ਜਾਵੋਗੇ।",
      go_page: "ਮੇਰੇ ਪੰਨੇ 'ਤੇ ਜਾਓ",
      err_uid: "ਆਪਣੀ ਯੂਨੀਕ ਆਈਡੀ ਪਾਓ।",
      err_pw: "ਆਪਣਾ ਪਾਸਵਰਡ ਪਾਓ।",
      err_bad: "ਆਈਡੀ ਜਾਂ ਪਾਸਵਰਡ ਸਹੀ ਨਹੀਂ ਹੈ। ਜਾਂਚ ਕੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
      err_role: "ਚੁਣੋ ਕਿ ਤੁਸੀਂ ਕਿਸ ਰੂਪ ਵਿੱਚ ਰਜਿਸਟਰ ਕਰ ਰਹੇ ਹੋ।",
      err_name: "ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਪਾਓ।",
      err_mobile: "10 ਅੰਕਾਂ ਦਾ ਸਹੀ ਮੋਬਾਈਲ ਨੰਬਰ ਪਾਓ।",
      err_place: "ਆਪਣੇ ਪਿੰਡ, ਕਲੀਨਿਕ ਜਾਂ ਸਕੂਲ ਦਾ ਨਾਮ ਪਾਓ।",
      err_pw_len: "ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।",
      err_pw_match: "ਦੋਵੇਂ ਪਾਸਵਰਡ ਮੇਲ ਨਹੀਂ ਖਾਂਦੇ।",
      err_dup: "ਇਹ ਮੋਬਾਈਲ ਨੰਬਰ ਇਸ ਭੂਮਿਕਾ ਲਈ ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰ ਹੈ। ਆਪਣੀ ਯੂਨੀਕ ਆਈਡੀ ਨਾਲ ਸਾਈਨ ਇਨ ਕਰੋ।",
      err_storage: "ਇਹ ਬ੍ਰਾਊਜ਼ਰ ਸਟੋਰੇਜ ਰੋਕ ਰਿਹਾ ਹੈ, ਇਸ ਲਈ ਖਾਤਾ ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ। ਸਾਈਟ ਨੂੰ Chrome ਵਿੱਚ ਜਾਂ ਲੋਕਲ ਸਰਵਰ ਤੋਂ ਖੋਲ੍ਹੋ।"
    }
  };

  var SIZES = [90, 100, 115, 130, 150]; // % of the browser's base font size
  var DEFAULT_SIZE = 1;

  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

  /* Lets app.js show messages (errors, hints) in the chosen language. */
  window.jsT = function (key, fallback) {
    var lang = document.documentElement.lang || "en";
    if (T[lang] && T[lang][key] !== undefined) return T[lang][key];
    if (T.en[key] !== undefined) return T.en[key];
    return fallback;
  };

  /* ---------- Language ---------- */
  var originals = new Map(); // remember the English text from the HTML

  function setLanguage(lang) {
    if (!T[lang]) lang = "en";
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (!originals.has(el)) originals.set(el, el.textContent);
      var key = el.getAttribute("data-i18n");
      var text = (T[lang][key] !== undefined) ? T[lang][key] : (T.en[key] !== undefined ? T.en[key] : originals.get(el));
      el.textContent = text;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      if (!originals.has(el)) originals.set(el, el.getAttribute("placeholder"));
      var key = el.getAttribute("data-i18n-placeholder");
      var text = (T[lang][key] !== undefined) ? T[lang][key] : (T.en[key] !== undefined ? T.en[key] : originals.get(el));
      el.setAttribute("placeholder", text);
    });

    save("js-lang", lang);
  }

  /* ---------- Font size ---------- */
  var sizeIndex = DEFAULT_SIZE;

  function setSize(i) {
    sizeIndex = Math.max(0, Math.min(SIZES.length - 1, i));
    document.documentElement.style.fontSize = SIZES[sizeIndex] + "%";
    var down = document.getElementById("font-down");
    var up = document.getElementById("font-up");
    if (down) down.disabled = sizeIndex === 0;
    if (up) up.disabled = sizeIndex === SIZES.length - 1;
    save("js-fontsize", String(sizeIndex));
  }

  /* ---------- Init ---------- */
  function init() {
    var select = document.getElementById("lang");
    var savedLang = load("js-lang") || "en";
    if (select) {
      select.value = T[savedLang] ? savedLang : "en";
      select.addEventListener("change", function () { setLanguage(select.value); });
    }
    setLanguage(select ? select.value : savedLang);

    var savedSize = parseInt(load("js-fontsize"), 10);
    setSize(isNaN(savedSize) ? DEFAULT_SIZE : savedSize);

    var down = document.getElementById("font-down");
    var up = document.getElementById("font-up");
    var reset = document.getElementById("font-reset");
    if (down) down.addEventListener("click", function () { setSize(sizeIndex - 1); });
    if (up) up.addEventListener("click", function () { setSize(sizeIndex + 1); });
    if (reset) reset.addEventListener("click", function () { setSize(DEFAULT_SIZE); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();