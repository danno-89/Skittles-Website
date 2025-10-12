// temporary-firestore-script.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from './public/firebase.config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const createSscCupData = async () => {
  try {
    await setDoc(doc(db, "ssc_cup", "2025-26"), {
        "Group_A":{
            "standings":[
                {"teamName":"wizards","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"ott","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"les-pins","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"ufos","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"technocrats","played":0,"won":0,"lost":0,"points":0}
            ],
            "fixtures":[]
        },
        "Group_B":{
            "standings":[
                {"teamName":"oberlands","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"p_ds","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"irregulars","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"sappers","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"titons","played":0,"won":0,"lost":0,"points":0}
            ],
            "fixtures":[]
        },
        "Group_C":{
            "standings":[
                {"teamName":"clippers","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"dolphins","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"taste-the-rainbow","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"canaccord-pinvestors","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"wild-stallions","played":0,"won":0,"lost":0,"points":0}
            ],
            "fixtures":[]
        },
        "Group_D":{
            "standings":[
                {"teamName":"chalkers","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"johnnie-walkers","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"longshots","played":0,"won":0,"lost":0,"points":0},
                {"teamName":"desperados","played":0,"won":0,"lost":0,"points":0}
            ],
            "fixtures":[]
        }
    });
    console.log("SSC Cup data created successfully.");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

createSscCupData();
