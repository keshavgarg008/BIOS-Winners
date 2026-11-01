/* Gaon Setu: vaccination schedule, based on the National Immunization Schedule chart.
   weeks:  due this many weeks after birth
   months: due this many months after birth (start of the age window)
   Due dates are estimates from the date of birth. Check them against official guidance. */
(function (global) {
  "use strict";

  var ITEMS = [
    { stage: "At birth", code: "BCG", desc: "Tuberculosis", weeks: 0 },
    { stage: "At birth", code: "Hep B-0", desc: "Hepatitis B (birth dose)", weeks: 0 },
    { stage: "At birth", code: "OPV-0", desc: "Polio (oral), zero dose", weeks: 0 },

    { stage: "6 weeks", code: "OPV-1", desc: "Polio (oral)", weeks: 6 },
    { stage: "6 weeks", code: "RVV-1", desc: "Rotavirus", weeks: 6 },
    { stage: "6 weeks", code: "fIPV-1", desc: "Polio (injection)", weeks: 6 },
    { stage: "6 weeks", code: "Pentavalent-1", desc: "Diphtheria, pertussis, tetanus, hepatitis B, Hib", weeks: 6 },
    { stage: "6 weeks", code: "PCV-1", desc: "Pneumococcal", weeks: 6 },

    { stage: "10 weeks", code: "OPV-2", desc: "Polio (oral)", weeks: 10 },
    { stage: "10 weeks", code: "RVV-2", desc: "Rotavirus", weeks: 10 },
    { stage: "10 weeks", code: "Pentavalent-2", desc: "Diphtheria, pertussis, tetanus, hepatitis B, Hib", weeks: 10 },

    { stage: "14 weeks", code: "OPV-3", desc: "Polio (oral)", weeks: 14 },
    { stage: "14 weeks", code: "RVV-3", desc: "Rotavirus", weeks: 14 },
    { stage: "14 weeks", code: "fIPV-2", desc: "Polio (injection)", weeks: 14 },
    { stage: "14 weeks", code: "Pentavalent-3", desc: "Diphtheria, pertussis, tetanus, hepatitis B, Hib", weeks: 14 },
    { stage: "14 weeks", code: "PCV-2", desc: "Pneumococcal", weeks: 14 },

    { stage: "9–12 months", code: "MR-1", desc: "Measles and rubella", months: 9 },
    { stage: "9–12 months", code: "fIPV-3", desc: "Polio (injection)", months: 9 },
    { stage: "9–12 months", code: "PCV booster", desc: "Pneumococcal", months: 9 },
    { stage: "9–12 months", code: "JE-1", desc: "Japanese encephalitis", months: 9 },

    { stage: "16–24 months", code: "OPV booster", desc: "Polio (oral)", months: 16 },
    { stage: "16–24 months", code: "MR-2", desc: "Measles and rubella", months: 16 },
    { stage: "16–24 months", code: "DPT booster-1", desc: "Diphtheria, pertussis, tetanus", months: 16 },
    { stage: "16–24 months", code: "JE-2", desc: "Japanese encephalitis", months: 16 },

    { stage: "5–6 years", code: "DPT booster-2", desc: "Diphtheria, pertussis, tetanus", months: 60 },

    { stage: "10 years", code: "Td-10", desc: "Tetanus and diphtheria", months: 120 },
    { stage: "16 years", code: "Td-16", desc: "Tetanus and diphtheria", months: 192 }
  ];

  global.GSSchedule = { ITEMS: ITEMS };
})(window);
