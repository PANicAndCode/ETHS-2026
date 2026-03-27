const CLUES = {
  "1": {
    "title": "Help Ma plant some onions.",
    "location": "Garden",
    "hint": "Check the garden.",
    "zone": {
      "x": 19,
      "y": 60
    }
  },
  "2": {
    "title": "Help Ma water the flowers.",
    "location": "Hose",
    "hint": "Check under the watering can by the hose.",
    "zone": {
      "x": 45,
      "y": 55
    }
  },
  "3": {
    "title": "Help Ma entertain Chris.",
    "location": "Playset",
    "hint": "Go grab a sword from the playset and fight Christopher.",
    "subtitle": "Grab something from the playset. Spare Christopher to three hits to get the next clue.",
    "zone": {
      "x": 49,
      "y": 39
    }
  },
  "4": {
    "title": "Help Ma fix the tv channels.",
    "location": "Satellite tower",
    "hint": "Go to the garage and find a satellite tower.",
    "zone": {
      "x": 40,
      "y": 30
    }
  },
  "5": {
    "title": "Get dressed for Easter!",
    "location": "Garage",
    "hint": "Go to the garage and check the dresser.",
    "subtitle": "There are Easter Bunny ears in the dresser. Make sure to wear them.",
    "zone": {
      "x": 39,
      "y": 35
    }
  },
  "6": {
    "title": "Get the heavy duty sled to prepare for snow.",
    "location": "Toboggan",
    "hint": "Go to the old chicken house down the hill from the garden and look around for a toboggan.",
    "zone": {
      "x": 5,
      "y": 50
    }
  },
  "7": {
    "title": "Check how much rain we got last night.",
    "location": "Rain gauge",
    "hint": "Go to the rain gauge toward the pond.",
    "zone": {
      "x": 57,
      "y": 45
    }
  },
  "8": {
    "title": "Go feed the barn kitties.",
    "location": "Barn",
    "hint": "Go inside the old barn and look through the missing board.",
    "zone": {
      "x": 65,
      "y": 35
    }
  },
  "9": {
    "title": "Help Ma fix her tweety friend camera.",
    "location": "Bird Feeder",
    "hint": "Go to the bird feeders and open the one with a camera.",
    "zone": {
      "x": 50,
      "y": 40
    }
  },
  "10": {
    "title": "Help Ma pick some apples.",
    "location": "Orchard",
    "hint": "Go look through the orchard.",
    "zone": {
      "x": 35,
      "y": 18
    }
  },
  "11": {
    "title": "FINAL EGG: Find the last egg!",
    "location": "Dock",
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
      10
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
      7
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
      6
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
      5
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
      3
    ]
  }
};

const TOKENS = {
  "Team1": [
    "LKA55EESG4",
    "TWN8D57KXZ",
    "DK62GH4J52",
    "9R435KNSY7",
    "X5ACQBHYSV",
    "NK5H8RW3KD",
    "RNFL5UA5J7",
    "CKGRJ7EJU9",
    "6M4P229JQ8",
    "FVW79P4P7C"
  ],
  "Team2": [
    "YCUPHGW8U7",
    "B25EHBLLYR",
    "877AWPKLJD",
    "SLQEXJYV33",
    "G5CQR2FA54",
    "T94QLS7RKW",
    "H2BM5JQCCG",
    "5G2GN9RYH8",
    "PTCC83LKS6",
    "BLHMHC557N"
  ],
  "Team3": [
    "8ME7SM5M5U",
    "QPQ7FQNNQ9",
    "EFY3Z337NN",
    "FQ6228FE4F",
    "APRWHH2QNW",
    "F5V9PULBME",
    "STJ36X5CTC",
    "QRK3ZHMTH5",
    "4JWZVATWDQ",
    "W6WT2TZT9P"
  ],
  "Team4": [
    "Y4NF54DWFY",
    "7WPG6PQTFV",
    "A4QG7AS24L",
    "KY6X64Q68U",
    "3VYEHU3P2R",
    "2KQULULGAW",
    "HV53ZXMYQC",
    "NAX6324ZS5",
    "YX866XPRLK",
    "RAPSSLKLGT"
  ],
  "Team5": [
    "6GWL8R5SVH",
    "MKM8RNKP32",
    "N8WLH3LBTN",
    "Q6HHCWMZQU",
    "JWEUNJ3SYB",
    "SC77M5ZWLH",
    "9QGJ5P6WKC",
    "ZZ9EKSSCMA",
    "8YYUXRV6CU",
    "7R22QNUJKX"
  ]
};
