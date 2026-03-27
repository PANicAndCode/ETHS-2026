const CLUES = {
  "1": {
    "title": "Help Ma plant some onions.",
    "location": "Garden",
    "hint": "Check the garden.",
    "zone": {
      "x": 24,
      "y": 57
    }
  },
  "2": {
    "title": "Help Ma water the flowers.",
    "location": "By the hose",
    "hint": "Check under the watering can by the hose.",
    "zone": {
      "x": 45,
      "y": 60
    }
  },
  "3": {
    "title": "Help Ma entertain Chris.",
    "location": "Playset / Christopher challenge",
    "hint": "Go grab a sword from the playset and fight Christopher.",
    "subtitle": "Grab something from the playset. Spare Christopher to three hits to get the next clue.",
    "zone": {
      "x": 49,
      "y": 47
    }
  },
  "4": {
    "title": "Help Ma fix the tv channels.",
    "location": "Satellite tower",
    "hint": "Go to the garage and find a satellite tower.",
    "zone": {
      "x": 40,
      "y": 39
    }
  },
  "5": {
    "title": "Get dressed for Easter!",
    "location": "Garage dresser",
    "hint": "Go to the garage and check the dresser.",
    "subtitle": "There are Easter Bunny ears in the dresser. Make sure to wear them.",
    "zone": {
      "x": 37,
      "y": 42
    }
  },
  "6": {
    "title": "Get the heavy duty sled to prepare for snow.",
    "location": "By the toboggan",
    "hint": "Go to the old chicken house down the hill from the garden and look around for a toboggan.",
    "zone": {
      "x": 5,
      "y": 72
    }
  },
  "7": {
    "title": "Check how much rain we got last night.",
    "location": "Rain gauge",
    "hint": "Go to the rain gauge toward the pond.",
    "zone": {
      "x": 57,
      "y": 58
    }
  },
  "8": {
    "title": "Go feed the barn kitties.",
    "location": "Barn",
    "hint": "Go inside the old barn and look through the missing board.",
    "zone": {
      "x": 65,
      "y": 46
    }
  },
  "9": {
    "title": "Help Ma fix her tweety friend camera.",
    "location": "Bird feeder with camera",
    "hint": "Go to the bird feeders and open the one with a camera.",
    "zone": {
      "x": 45,
      "y": 73
    }
  },
  "10": {
    "title": "Help Ma pick some apples.",
    "location": "Apple orchard",
    "hint": "Go look through the orchard.",
    "zone": {
      "x": 38,
      "y": 18
    }
  },
  "11": {
    "title": "FINAL CLUE: Go fix the dock!",
    "location": "Pond / dock",
    "hint": "Go to the pond and look around.",
    "zone": {
      "x": 74,
      "y": 88
    }
  }
};

const TEAMS = {
  "Team1": {
    "label": "Team 1",
    "sequence": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11
    ]
  },
  "Team2": {
    "label": "Team 2",
    "sequence": [
      5,
      1,
      8,
      2,
      9,
      3,
      6,
      4,
      10,
      7,
      11
    ]
  },
  "Team3": {
    "label": "Team 3",
    "sequence": [
      7,
      4,
      2,
      10,
      1,
      9,
      5,
      8,
      3,
      6,
      11
    ]
  },
  "Team4": {
    "label": "Team 4",
    "sequence": [
      3,
      6,
      1,
      9,
      4,
      7,
      10,
      2,
      8,
      5,
      11
    ]
  },
  "Team5": {
    "label": "Team 5",
    "sequence": [
      8,
      10,
      5,
      7,
      2,
      6,
      4,
      1,
      9,
      3,
      11
    ]
  }
};

const TOKENS = {
  "Team1": [
    "T1-UNLOCK-02-GARDEN",
    "T1-UNLOCK-03-HOSE",
    "T1-UNLOCK-04-PLAY",
    "T1-UNLOCK-05-TOWER",
    "T1-UNLOCK-06-GARAGE",
    "T1-UNLOCK-07-SLED",
    "T1-UNLOCK-08-RAIN",
    "T1-UNLOCK-09-BARN",
    "T1-UNLOCK-10-BIRD",
    "T1-UNLOCK-11-APPLE",
    "T1-FINISH-DOCK"
  ],
  "Team2": [
    "T2-UNLOCK-02-GARAGE",
    "T2-UNLOCK-03-GARDEN",
    "T2-UNLOCK-04-BARN",
    "T2-UNLOCK-05-HOSE",
    "T2-UNLOCK-06-BIRD",
    "T2-UNLOCK-07-PLAY",
    "T2-UNLOCK-08-SLED",
    "T2-UNLOCK-09-TOWER",
    "T2-UNLOCK-10-APPLE",
    "T2-UNLOCK-11-RAIN",
    "T2-FINISH-DOCK"
  ],
  "Team3": [
    "T3-UNLOCK-02-RAIN",
    "T3-UNLOCK-03-TOWER",
    "T3-UNLOCK-04-HOSE",
    "T3-UNLOCK-05-APPLE",
    "T3-UNLOCK-06-GARDEN",
    "T3-UNLOCK-07-BIRD",
    "T3-UNLOCK-08-GARAGE",
    "T3-UNLOCK-09-BARN",
    "T3-UNLOCK-10-PLAY",
    "T3-UNLOCK-11-SLED",
    "T3-FINISH-DOCK"
  ],
  "Team4": [
    "T4-UNLOCK-02-PLAY",
    "T4-UNLOCK-03-SLED",
    "T4-UNLOCK-04-GARDEN",
    "T4-UNLOCK-05-BIRD",
    "T4-UNLOCK-06-TOWER",
    "T4-UNLOCK-07-RAIN",
    "T4-UNLOCK-08-APPLE",
    "T4-UNLOCK-09-HOSE",
    "T4-UNLOCK-10-BARN",
    "T4-UNLOCK-11-GARAGE",
    "T4-FINISH-DOCK"
  ],
  "Team5": [
    "T5-UNLOCK-02-BARN",
    "T5-UNLOCK-03-APPLE",
    "T5-UNLOCK-04-GARAGE",
    "T5-UNLOCK-05-RAIN",
    "T5-UNLOCK-06-HOSE",
    "T5-UNLOCK-07-SLED",
    "T5-UNLOCK-08-TOWER",
    "T5-UNLOCK-09-GARDEN",
    "T5-UNLOCK-10-BIRD",
    "T5-UNLOCK-11-PLAY",
    "T5-FINISH-DOCK"
  ]
};
