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
    "title": "FINAL EGG: Find the last egg!",
    "location": "Pond / dock",
    "hint": "Go to the pond and look around the dock for the final egg.",
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
    "OGZMXS7VJB",
    "60GIIUEG45",
    "KDEAYOPPXE",
    "07R78W8USC",
    "DA17HH1YCL",
    "HKD5RKKNM3",
    "C10PEXRT5Z",
    "G942RD8UA7",
    "UO6AZKDN71",
    "YOI2ZQGYGL",
    "TK0KAKONVN"
  ],
  "Team2": [
    "DA17HH1YCL",
    "OGZMXS7VJB",
    "G942RD8UA7",
    "60GIIUEG45",
    "UO6AZKDN71",
    "KDEAYOPPXE",
    "HKD5RKKNM3",
    "07R78W8USC",
    "YOI2ZQGYGL",
    "C10PEXRT5Z",
    "TK0KAKONVN"
  ],
  "Team3": [
    "C10PEXRT5Z",
    "07R78W8USC",
    "60GIIUEG45",
    "YOI2ZQGYGL",
    "OGZMXS7VJB",
    "UO6AZKDN71",
    "DA17HH1YCL",
    "G942RD8UA7",
    "KDEAYOPPXE",
    "HKD5RKKNM3",
    "TK0KAKONVN"
  ],
  "Team4": [
    "KDEAYOPPXE",
    "HKD5RKKNM3",
    "OGZMXS7VJB",
    "UO6AZKDN71",
    "07R78W8USC",
    "C10PEXRT5Z",
    "YOI2ZQGYGL",
    "60GIIUEG45",
    "G942RD8UA7",
    "DA17HH1YCL",
    "TK0KAKONVN"
  ],
  "Team5": [
    "G942RD8UA7",
    "YOI2ZQGYGL",
    "DA17HH1YCL",
    "C10PEXRT5Z",
    "60GIIUEG45",
    "HKD5RKKNM3",
    "07R78W8USC",
    "OGZMXS7VJB",
    "UO6AZKDN71",
    "KDEAYOPPXE",
    "TK0KAKONVN"
  ]
};
