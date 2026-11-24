// Which version of the recurring cast to build.
//   'v1'  the original procedural rig (Episodes up to 063)
//   'glb' the owner's real Higgsfield 3D avatars (Episode 064 onwards), set by
//         `await useGlbCast()` from glbcast.js at the top of episode.js
//   'v2'  a procedural lookalike of the avatars (cast2.js); superseded by 'glb'
let STYLE = 'v1';
export const setCastStyle = (s) => {
  STYLE = s;
};
export const castStyle = () => STYLE;
