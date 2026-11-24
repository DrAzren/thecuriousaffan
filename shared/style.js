// Which version of the recurring cast to build. Episodes up to 063 use the
// original rig (v1); Episode 064 onwards call setCastStyle('v2') before
// building any set, so makeAffan() and makeMama() return the version 2
// characters from cast2.js (matching assets/characters/*_v2_*).
let STYLE = 'v1';
export const setCastStyle = (s) => {
  STYLE = s;
};
export const castStyle = () => STYLE;
