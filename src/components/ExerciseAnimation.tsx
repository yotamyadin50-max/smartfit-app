import { useMemo } from 'react'
import { useI18n } from '../context/I18nContext'

type MuscleId =
  | 'chest' | 'front-delts' | 'side-delts' | 'rear-delts'
  | 'biceps' | 'triceps' | 'forearms'
  | 'upper-abs' | 'lower-abs' | 'obliques' | 'core'
  | 'lats' | 'upper-back' | 'lower-back' | 'traps'
  | 'quads' | 'hamstrings' | 'glutes'
  | 'calves' | 'hip-flexors'

interface ExerciseDef {
  muscles: MuscleId[]
  anim: string
}

const MUSCLE_LABEL: Record<MuscleId, [string, string]> = {
  'chest':       ['Chest', 'חזה'],
  'front-delts': ['Front Deltoids', 'כתף קדמית'],
  'side-delts':  ['Side Deltoids', 'כתף צדדית'],
  'rear-delts':  ['Rear Deltoids', 'כתף אחורית'],
  'biceps':      ['Biceps', 'בייספס'],
  'triceps':     ['Triceps', 'טרייספס'],
  'forearms':    ['Forearms', 'אמות'],
  'upper-abs':   ['Upper Abs', 'בטן עליונה'],
  'lower-abs':   ['Lower Abs', 'בטן תחתונה'],
  'obliques':    ['Obliques', 'אלכסוני בטן'],
  'core':        ['Core', 'ליבה'],
  'lats':        ['Lats', 'גב רחב'],
  'upper-back':  ['Upper Back', 'גב עליון'],
  'lower-back':  ['Lower Back', 'גב תחתון'],
  'traps':       ['Trapezius', 'טרפז'],
  'quads':       ['Quadriceps', 'ארבע ראשי'],
  'hamstrings':  ['Hamstrings', 'גמישי ירך'],
  'glutes':      ['Glutes', 'ישבן'],
  'calves':      ['Calves', 'תאומים'],
  'hip-flexors': ['Hip Flexors', 'כופפי ירך'],
}

const EXERCISE_DEFS: Record<string, ExerciseDef> = {
  'squats':                  { muscles: ['quads', 'glutes', 'hamstrings', 'core'], anim: 'squat' },
  'goblet squat':            { muscles: ['quads', 'glutes', 'core'], anim: 'squat' },
  'smith machine squat':     { muscles: ['quads', 'glutes', 'hamstrings'], anim: 'squat' },
  'leg press':               { muscles: ['quads', 'glutes'], anim: 'leg-press' },
  'reverse lunge':           { muscles: ['quads', 'glutes', 'hamstrings'], anim: 'lunge' },
  'glute bridge':            { muscles: ['glutes', 'hamstrings', 'core'], anim: 'glute-bridge' },
  'seated leg curl':         { muscles: ['hamstrings'], anim: 'leg-curl' },
  'leg curl':                { muscles: ['hamstrings'], anim: 'leg-curl' },
  'leg extension':           { muscles: ['quads'], anim: 'leg-extension' },
  'standing calf raise':     { muscles: ['calves'], anim: 'calf-raise' },
  'calf raise':              { muscles: ['calves'], anim: 'calf-raise' },
  'push-ups':                { muscles: ['chest', 'triceps', 'front-delts', 'core'], anim: 'push-up' },
  'chest press machine':     { muscles: ['chest', 'triceps', 'front-delts'], anim: 'chest-press' },
  'incline dumbbell press':  { muscles: ['chest', 'triceps', 'front-delts'], anim: 'chest-press' },
  'cable fly':               { muscles: ['chest', 'front-delts'], anim: 'cable-fly' },
  'pec deck':                { muscles: ['chest', 'front-delts'], anim: 'cable-fly' },
  'dumbbell floor press':    { muscles: ['chest', 'triceps', 'front-delts'], anim: 'chest-press' },
  'lat pulldown':            { muscles: ['lats', 'biceps', 'rear-delts'], anim: 'pulldown' },
  'seated cable row':        { muscles: ['lats', 'biceps', 'upper-back', 'rear-delts'], anim: 'row' },
  'dumbbell rows':           { muscles: ['lats', 'biceps', 'upper-back'], anim: 'row' },
  'dumbbell bent-over row':  { muscles: ['lats', 'biceps', 'upper-back'], anim: 'row' },
  'single arm cable row':    { muscles: ['lats', 'biceps', 'upper-back'], anim: 'row' },
  'dumbbell single-arm row': { muscles: ['lats', 'biceps', 'upper-back'], anim: 'row' },
  'chest supported row':     { muscles: ['lats', 'upper-back', 'rear-delts'], anim: 'row' },
  'back extension':          { muscles: ['lower-back', 'glutes', 'hamstrings'], anim: 'back-extension' },
  'shoulder press machine':  { muscles: ['front-delts', 'side-delts', 'triceps'], anim: 'overhead-press' },
  'dumbbell shoulder press': { muscles: ['front-delts', 'side-delts', 'triceps'], anim: 'overhead-press' },
  'cable lateral raise':     { muscles: ['side-delts'], anim: 'lateral-raise' },
  'face pull':               { muscles: ['rear-delts', 'traps', 'upper-back'], anim: 'face-pull' },
  'rear delt machine':       { muscles: ['rear-delts', 'traps'], anim: 'face-pull' },
  'biceps curl':             { muscles: ['biceps', 'forearms'], anim: 'curl' },
  'dumbbell biceps curl':    { muscles: ['biceps', 'forearms'], anim: 'curl' },
  'preacher curl machine':   { muscles: ['biceps'], anim: 'curl' },
  'dumbbell hammer curl':    { muscles: ['biceps', 'forearms'], anim: 'curl' },
  'triceps dips':            { muscles: ['triceps', 'chest', 'front-delts'], anim: 'dip' },
  'cable triceps pushdown':  { muscles: ['triceps'], anim: 'triceps-push' },
  'plank':                   { muscles: ['core', 'upper-abs', 'lower-abs', 'obliques'], anim: 'plank' },
  'side plank':              { muscles: ['obliques', 'core'], anim: 'plank' },
  'mountain climbers':       { muscles: ['core', 'front-delts', 'quads', 'hip-flexors'], anim: 'mountain-climbers' },
  'reverse crunch':          { muscles: ['lower-abs', 'hip-flexors'], anim: 'crunch' },
  'cable crunch':            { muscles: ['upper-abs', 'lower-abs'], anim: 'crunch' },
  'hanging knee raise':      { muscles: ['lower-abs', 'hip-flexors', 'obliques'], anim: 'crunch' },
  'torso rotation machine':  { muscles: ['obliques', 'core'], anim: 'torso-rotation' },
  'כפיפת מרפקים':           { muscles: ['biceps', 'forearms'], anim: 'curl' },
  'סקוואטים':               { muscles: ['quads', 'glutes', 'hamstrings', 'core'], anim: 'squat' },
  'שכיבות סמיכה':           { muscles: ['chest', 'triceps', 'front-delts', 'core'], anim: 'push-up' },
  'פלאנק':                  { muscles: ['core', 'upper-abs', 'lower-abs'], anim: 'plank' },
  'לאנג׳ לאחור':            { muscles: ['quads', 'glutes', 'hamstrings'], anim: 'lunge' },
  'גשר ישבן':               { muscles: ['glutes', 'hamstrings', 'core'], anim: 'glute-bridge' },
  'מטפס הרים':              { muscles: ['core', 'front-delts', 'quads'], anim: 'mountain-climbers' },
}

function getExerciseDef(name: string): ExerciseDef {
  const lower = name.toLowerCase().trim()
  if (EXERCISE_DEFS[lower]) return EXERCISE_DEFS[lower]
  if (EXERCISE_DEFS[name.trim()]) return EXERCISE_DEFS[name.trim()]
  for (const [key, def] of Object.entries(EXERCISE_DEFS)) {
    if (lower.includes(key) || key.includes(lower)) return def
  }
  if (/squat|סקוואט/i.test(name)) return { muscles: ['quads', 'glutes'], anim: 'squat' }
  if (/curl|כפיפת מרפק/i.test(name)) return { muscles: ['biceps', 'forearms'], anim: 'curl' }
  if (/shoulder press|לחיצת כתפ/i.test(name)) return { muscles: ['front-delts', 'side-delts', 'triceps'], anim: 'overhead-press' }
  if (/chest press|לחיצת חזה/i.test(name)) return { muscles: ['chest', 'triceps'], anim: 'chest-press' }
  if (/press/i.test(name)) return { muscles: ['chest', 'front-delts', 'triceps'], anim: 'chest-press' }
  if (/pulldown|פולי עליון/i.test(name)) return { muscles: ['lats', 'biceps'], anim: 'pulldown' }
  if (/row|חתירה/i.test(name)) return { muscles: ['lats', 'biceps'], anim: 'row' }
  if (/plank|פלאנק/i.test(name)) return { muscles: ['core', 'upper-abs'], anim: 'plank' }
  if (/push.?up|שכיבות/i.test(name)) return { muscles: ['chest', 'triceps'], anim: 'push-up' }
  if (/lunge|לאנג/i.test(name)) return { muscles: ['quads', 'glutes'], anim: 'lunge' }
  if (/calf|תאומים/i.test(name)) return { muscles: ['calves'], anim: 'calf-raise' }
  if (/leg curl|כפיפת ברך/i.test(name)) return { muscles: ['hamstrings'], anim: 'leg-curl' }
  if (/leg extension|פשיטת ברך/i.test(name)) return { muscles: ['quads'], anim: 'leg-extension' }
  if (/leg press|לחיצת רגל/i.test(name)) return { muscles: ['quads', 'glutes'], anim: 'leg-press' }
  if (/crunch|כפיפות בטן/i.test(name)) return { muscles: ['upper-abs', 'lower-abs'], anim: 'crunch' }
  if (/dip/i.test(name)) return { muscles: ['triceps', 'chest'], anim: 'dip' }
  if (/lateral.raise|הרחקת כתף/i.test(name)) return { muscles: ['side-delts'], anim: 'lateral-raise' }
  if (/face.pull|משיכת פנים/i.test(name)) return { muscles: ['rear-delts', 'upper-back'], anim: 'face-pull' }
  if (/back extension|פשיטת גב/i.test(name)) return { muscles: ['lower-back', 'glutes'], anim: 'back-extension' }
  if (/glute bridge|גשר ישבן/i.test(name)) return { muscles: ['glutes', 'hamstrings'], anim: 'glute-bridge' }
  if (/mountain.climber|מטפס/i.test(name)) return { muscles: ['core', 'quads'], anim: 'mountain-climbers' }
  if (/rotation|רוטציה/i.test(name)) return { muscles: ['obliques', 'core'], anim: 'torso-rotation' }
  if (/fly|פרפר/i.test(name)) return { muscles: ['chest', 'front-delts'], anim: 'cable-fly' }
  if (/pushdown|tricep|טרייספס/i.test(name)) return { muscles: ['triceps'], anim: 'triceps-push' }
  return { muscles: ['core'], anim: 'standing' }
}

const MUSCLE_SVG_IDS: Record<MuscleId, string[]> = {
  'chest':       ['m-chest-l', 'm-chest-r'],
  'front-delts': ['m-delt-l', 'm-delt-r'],
  'side-delts':  ['m-delt-l', 'm-delt-r'],
  'rear-delts':  ['m-delt-l', 'm-delt-r'],
  'biceps':      ['m-bicep-l', 'm-bicep-r'],
  'triceps':     ['m-tricep-l', 'm-tricep-r'],
  'forearms':    ['m-forearm-l', 'm-forearm-r'],
  'upper-abs':   ['m-upper-abs'],
  'lower-abs':   ['m-lower-abs'],
  'obliques':    ['m-oblique-l', 'm-oblique-r'],
  'core':        ['m-upper-abs', 'm-lower-abs'],
  'lats':        ['m-lat-l', 'm-lat-r'],
  'upper-back':  ['m-upper-back'],
  'lower-back':  ['m-lower-back'],
  'traps':       ['m-trap-l', 'm-trap-r'],
  'quads':       ['m-quad-l', 'm-quad-r'],
  'hamstrings':  ['m-ham-l', 'm-ham-r'],
  'glutes':      ['m-glute'],
  'calves':      ['m-calf-l', 'm-calf-r'],
  'hip-flexors': ['m-lower-abs', 'm-glute'],
}

const CSS = `
.ex-anim-wrap { display:flex; flex-direction:column; align-items:center; gap:0; }
.ex-anim-svg { width:130px; height:auto; display:block; filter:drop-shadow(0 0 10px rgba(130,50,220,0.25)); }
.muscle { fill:rgba(255,255,255,0.06); }
.muscle.active { fill:rgba(239,68,68,0.6); animation:muscle-pulse 1.2s ease-in-out infinite alternate; }
@keyframes muscle-pulse { from{fill:rgba(239,68,68,0.45)} to{fill:rgba(255,90,70,0.78)} }

/* SQUAT */
.anim-squat #ex-torso,.anim-squat #ex-head { animation:squat-body 2s ease-in-out infinite; }
.anim-squat #ex-left-upper-arm { animation:squat-arm-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-squat #ex-right-upper-arm { animation:squat-arm-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-squat #ex-left-thigh { animation:squat-thigh-l 2s ease-in-out infinite; transform-origin:44px 128px; }
.anim-squat #ex-right-thigh { animation:squat-thigh-r 2s ease-in-out infinite; transform-origin:76px 128px; }
.anim-squat #ex-left-shin { animation:squat-shin 2s ease-in-out infinite; transform-origin:34px 172px; }
.anim-squat #ex-right-shin { animation:squat-shin 2s ease-in-out infinite; transform-origin:86px 172px; }
@keyframes squat-body { 0%,100%{transform:translateY(0)} 50%{transform:translateY(22px)} }
@keyframes squat-arm-l { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-18deg)} }
@keyframes squat-arm-r { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(18deg)} }
@keyframes squat-thigh-l { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(38deg)} }
@keyframes squat-thigh-r { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-38deg)} }
@keyframes squat-shin { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-30deg)} }

/* CURL */
.anim-curl #ex-left-forearm { animation:curl-arm 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-curl #ex-right-forearm { animation:curl-arm 2s ease-in-out infinite; transform-origin:103px 70px; }
@keyframes curl-arm { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-125deg)} }

/* OVERHEAD PRESS */
.anim-overhead-press #ex-left-upper-arm { animation:ohp-upper-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-overhead-press #ex-right-upper-arm { animation:ohp-upper-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-overhead-press #ex-left-forearm { animation:ohp-forearm 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-overhead-press #ex-right-forearm { animation:ohp-forearm 2s ease-in-out infinite; transform-origin:103px 70px; }
@keyframes ohp-upper-l { 0%,100%{transform:rotate(-22deg)} 50%{transform:rotate(-88deg)} }
@keyframes ohp-upper-r { 0%,100%{transform:rotate(22deg)} 50%{transform:rotate(88deg)} }
@keyframes ohp-forearm { 0%,100%{transform:rotate(48deg)} 50%{transform:rotate(5deg)} }

/* CHEST PRESS */
.anim-chest-press #ex-left-upper-arm { animation:cp-upper-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-chest-press #ex-right-upper-arm { animation:cp-upper-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-chest-press #ex-left-forearm { animation:cp-forearm-l 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-chest-press #ex-right-forearm { animation:cp-forearm-r 2s ease-in-out infinite; transform-origin:103px 70px; }
@keyframes cp-upper-l { 0%,100%{transform:rotate(18deg)} 50%{transform:rotate(-5deg)} }
@keyframes cp-upper-r { 0%,100%{transform:rotate(-18deg)} 50%{transform:rotate(5deg)} }
@keyframes cp-forearm-l { 0%,100%{transform:rotate(-38deg)} 50%{transform:rotate(-62deg)} }
@keyframes cp-forearm-r { 0%,100%{transform:rotate(38deg)} 50%{transform:rotate(62deg)} }

/* CABLE FLY */
.anim-cable-fly #ex-left-upper-arm { animation:fly-upper-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-cable-fly #ex-right-upper-arm { animation:fly-upper-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-cable-fly #ex-left-forearm { animation:fly-forearm 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-cable-fly #ex-right-forearm { animation:fly-forearm 2s ease-in-out infinite; transform-origin:103px 70px; }
@keyframes fly-upper-l { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-50deg)} }
@keyframes fly-upper-r { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(50deg)} }
@keyframes fly-forearm { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(20deg)} }

/* PULLDOWN */
.anim-pulldown #ex-left-upper-arm { animation:pd-upper-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-pulldown #ex-right-upper-arm { animation:pd-upper-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-pulldown #ex-left-forearm { animation:pd-forearm-l 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-pulldown #ex-right-forearm { animation:pd-forearm-r 2s ease-in-out infinite; transform-origin:103px 70px; }
@keyframes pd-upper-l { 0%,100%{transform:rotate(-72deg)} 50%{transform:rotate(12deg)} }
@keyframes pd-upper-r { 0%,100%{transform:rotate(72deg)} 50%{transform:rotate(-12deg)} }
@keyframes pd-forearm-l { 0%,100%{transform:rotate(-28deg)} 50%{transform:rotate(-88deg)} }
@keyframes pd-forearm-r { 0%,100%{transform:rotate(28deg)} 50%{transform:rotate(88deg)} }

/* ROW */
.anim-row #ex-torso,.anim-row #ex-head { animation:row-torso 2s ease-in-out infinite; transform-origin:60px 60px; }
.anim-row #ex-left-upper-arm { animation:row-arm-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-row #ex-right-upper-arm { animation:row-arm-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-row #ex-left-forearm { animation:row-forearm 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-row #ex-right-forearm { animation:row-forearm 2s ease-in-out infinite; transform-origin:103px 70px; }
@keyframes row-torso { 0%,100%{transform:rotate(34deg)} 50%{transform:rotate(30deg)} }
@keyframes row-arm-l { 0%,100%{transform:rotate(42deg)} 50%{transform:rotate(-12deg)} }
@keyframes row-arm-r { 0%,100%{transform:rotate(-42deg)} 50%{transform:rotate(12deg)} }
@keyframes row-forearm { 0%,100%{transform:rotate(18deg)} 50%{transform:rotate(-12deg)} }

/* PUSH-UP */
.anim-push-up #ex-torso,.anim-push-up #ex-head { animation:pu-torso 2s ease-in-out infinite; transform-origin:60px 60px; }
.anim-push-up #ex-left-upper-arm { animation:pu-arm-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-push-up #ex-right-upper-arm { animation:pu-arm-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-push-up #ex-left-forearm { animation:pu-forearm 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-push-up #ex-right-forearm { animation:pu-forearm 2s ease-in-out infinite; transform-origin:103px 70px; }
.anim-push-up #ex-left-thigh { animation:pu-thigh 2s ease-in-out infinite; transform-origin:44px 128px; }
.anim-push-up #ex-right-thigh { animation:pu-thigh 2s ease-in-out infinite; transform-origin:76px 128px; }
@keyframes pu-torso { 0%,100%{transform:rotate(-72deg) translateY(8px)} }
@keyframes pu-arm-l { 0%,100%{transform:rotate(82deg)} 50%{transform:rotate(65deg)} }
@keyframes pu-arm-r { 0%,100%{transform:rotate(-82deg)} 50%{transform:rotate(-65deg)} }
@keyframes pu-forearm { 0%,100%{transform:rotate(-80deg)} 50%{transform:rotate(-60deg)} }
@keyframes pu-thigh { 0%,100%{transform:rotate(-18deg)} }

/* LATERAL RAISE */
.anim-lateral-raise #ex-left-upper-arm { animation:lr-upper-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-lateral-raise #ex-right-upper-arm { animation:lr-upper-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-lateral-raise #ex-left-forearm { animation:lr-forearm 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-lateral-raise #ex-right-forearm { animation:lr-forearm 2s ease-in-out infinite; transform-origin:103px 70px; }
@keyframes lr-upper-l { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-58deg)} }
@keyframes lr-upper-r { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(58deg)} }
@keyframes lr-forearm { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-18deg)} }

/* LUNGE */
.anim-lunge #ex-right-thigh { animation:lunge-thigh-f 2s ease-in-out infinite; transform-origin:76px 128px; }
.anim-lunge #ex-right-shin { animation:lunge-shin-f 2s ease-in-out infinite; transform-origin:86px 172px; }
.anim-lunge #ex-left-thigh { animation:lunge-thigh-b 2s ease-in-out infinite; transform-origin:44px 128px; }
.anim-lunge #ex-left-shin { animation:lunge-shin-b 2s ease-in-out infinite; transform-origin:34px 172px; }
.anim-lunge #ex-torso,.anim-lunge #ex-head { animation:lunge-body 2s ease-in-out infinite; }
@keyframes lunge-thigh-f { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-35deg)} }
@keyframes lunge-shin-f { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(28deg)} }
@keyframes lunge-thigh-b { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(35deg)} }
@keyframes lunge-shin-b { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(10deg)} }
@keyframes lunge-body { 0%,100%{transform:translateY(0)} 50%{transform:translateY(14px)} }

/* GLUTE BRIDGE */
.anim-glute-bridge #ex-torso,.anim-glute-bridge #ex-head,.anim-glute-bridge #ex-left-upper-arm,.anim-glute-bridge #ex-right-upper-arm { animation:gb-upper 2s ease-in-out infinite; transform-origin:60px 100px; }
.anim-glute-bridge #ex-left-thigh { animation:gb-thigh-l 2s ease-in-out infinite; transform-origin:44px 128px; }
.anim-glute-bridge #ex-right-thigh { animation:gb-thigh-r 2s ease-in-out infinite; transform-origin:76px 128px; }
.anim-glute-bridge #ex-left-shin { animation:gb-shin 2s ease-in-out infinite; transform-origin:34px 172px; }
.anim-glute-bridge #ex-right-shin { animation:gb-shin 2s ease-in-out infinite; transform-origin:86px 172px; }
@keyframes gb-upper { 0%,100%{transform:rotate(40deg) translateY(-5px)} 50%{transform:rotate(35deg) translateY(-12px)} }
@keyframes gb-thigh-l { 0%,100%{transform:rotate(-30deg)} 50%{transform:rotate(-45deg)} }
@keyframes gb-thigh-r { 0%,100%{transform:rotate(30deg)} 50%{transform:rotate(45deg)} }
@keyframes gb-shin { 0%,100%{transform:rotate(-60deg)} }

/* CRUNCH */
.anim-crunch #ex-torso { animation:crunch-torso 2s ease-in-out infinite; transform-origin:60px 92px; }
.anim-crunch #ex-head { animation:crunch-head 2s ease-in-out infinite; transform-origin:60px 92px; }
.anim-crunch #ex-left-upper-arm { animation:crunch-arm-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-crunch #ex-right-upper-arm { animation:crunch-arm-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-crunch #ex-left-thigh { animation:crunch-thigh-l 2s ease-in-out infinite; transform-origin:44px 128px; }
.anim-crunch #ex-right-thigh { animation:crunch-thigh-r 2s ease-in-out infinite; transform-origin:76px 128px; }
.anim-crunch #ex-left-shin { animation:crunch-shin 2s ease-in-out infinite; transform-origin:34px 172px; }
.anim-crunch #ex-right-shin { animation:crunch-shin 2s ease-in-out infinite; transform-origin:86px 172px; }
@keyframes crunch-torso { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(22deg)} }
@keyframes crunch-head { 0%,100%{transform:rotate(0deg) translateY(0)} 50%{transform:rotate(22deg) translateY(6px)} }
@keyframes crunch-arm-l { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(12deg)} }
@keyframes crunch-arm-r { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-12deg)} }
@keyframes crunch-thigh-l { 0%,100%{transform:rotate(-38deg)} 50%{transform:rotate(-28deg)} }
@keyframes crunch-thigh-r { 0%,100%{transform:rotate(38deg)} 50%{transform:rotate(28deg)} }
@keyframes crunch-shin { 0%,100%{transform:rotate(-55deg)} }

/* LEG PRESS */
.anim-leg-press #ex-torso,.anim-leg-press #ex-head,.anim-leg-press #ex-left-upper-arm,.anim-leg-press #ex-right-upper-arm { animation:lp-upper 2s ease-in-out infinite; transform-origin:60px 60px; }
.anim-leg-press #ex-left-thigh { animation:lp-thigh-l 2s ease-in-out infinite; transform-origin:44px 128px; }
.anim-leg-press #ex-right-thigh { animation:lp-thigh-r 2s ease-in-out infinite; transform-origin:76px 128px; }
.anim-leg-press #ex-left-shin { animation:lp-shin 2s ease-in-out infinite; transform-origin:34px 172px; }
.anim-leg-press #ex-right-shin { animation:lp-shin 2s ease-in-out infinite; transform-origin:86px 172px; }
@keyframes lp-upper { 0%,100%{transform:rotate(28deg)} }
@keyframes lp-thigh-l { 0%,100%{transform:rotate(48deg)} 50%{transform:rotate(8deg)} }
@keyframes lp-thigh-r { 0%,100%{transform:rotate(-48deg)} 50%{transform:rotate(-8deg)} }
@keyframes lp-shin { 0%,100%{transform:rotate(-55deg)} 50%{transform:rotate(-15deg)} }

/* LEG CURL */
.anim-leg-curl #ex-torso,.anim-leg-curl #ex-head { animation:lc-torso 2s ease-in-out infinite; transform-origin:60px 60px; }
.anim-leg-curl #ex-left-thigh { animation:lc-thigh 2s ease-in-out infinite; transform-origin:44px 128px; }
.anim-leg-curl #ex-right-thigh { animation:lc-thigh 2s ease-in-out infinite; transform-origin:76px 128px; }
.anim-leg-curl #ex-left-shin { animation:lc-shin 2s ease-in-out infinite; transform-origin:34px 172px; }
.anim-leg-curl #ex-right-shin { animation:lc-shin 2s ease-in-out infinite; transform-origin:86px 172px; }
@keyframes lc-torso { 0%,100%{transform:rotate(28deg)} }
@keyframes lc-thigh { 0%,100%{transform:rotate(45deg)} }
@keyframes lc-shin { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-100deg)} }

/* LEG EXTENSION */
.anim-leg-extension #ex-torso,.anim-leg-extension #ex-head { animation:le-torso 2s ease-in-out infinite; transform-origin:60px 60px; }
.anim-leg-extension #ex-left-thigh { animation:le-thigh 2s ease-in-out infinite; transform-origin:44px 128px; }
.anim-leg-extension #ex-right-thigh { animation:le-thigh 2s ease-in-out infinite; transform-origin:76px 128px; }
.anim-leg-extension #ex-left-shin { animation:le-shin 2s ease-in-out infinite; transform-origin:34px 172px; }
.anim-leg-extension #ex-right-shin { animation:le-shin 2s ease-in-out infinite; transform-origin:86px 172px; }
@keyframes le-torso { 0%,100%{transform:rotate(28deg)} }
@keyframes le-thigh { 0%,100%{transform:rotate(45deg)} }
@keyframes le-shin { 0%,100%{transform:rotate(-70deg)} 50%{transform:rotate(0deg)} }

/* CALF RAISE */
.anim-calf-raise #ex-left-shin,.anim-calf-raise #ex-right-shin { animation:cr-shin 2s ease-in-out infinite; }
.anim-calf-raise #ex-torso,.anim-calf-raise #ex-head,.anim-calf-raise #ex-left-upper-arm,.anim-calf-raise #ex-right-upper-arm { animation:cr-body 2s ease-in-out infinite; }
@keyframes cr-shin { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes cr-body { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }

/* PLANK */
.anim-plank #ex-torso,.anim-plank #ex-head { animation:plank-torso 3s ease-in-out infinite; transform-origin:60px 60px; }
.anim-plank #ex-left-upper-arm { animation:plank-arm-l 3s ease-in-out infinite; transform-origin:28px 32px; }
.anim-plank #ex-right-upper-arm { animation:plank-arm-r 3s ease-in-out infinite; transform-origin:92px 32px; }
.anim-plank #ex-left-forearm { animation:plank-forearm-l 3s ease-in-out infinite; transform-origin:17px 70px; }
.anim-plank #ex-right-forearm { animation:plank-forearm-r 3s ease-in-out infinite; transform-origin:103px 70px; }
.anim-plank #ex-left-thigh { animation:plank-thigh 3s ease-in-out infinite; transform-origin:44px 128px; }
.anim-plank #ex-right-thigh { animation:plank-thigh 3s ease-in-out infinite; transform-origin:76px 128px; }
.anim-plank #ex-left-shin { animation:plank-shin 3s ease-in-out infinite; transform-origin:34px 172px; }
.anim-plank #ex-right-shin { animation:plank-shin 3s ease-in-out infinite; transform-origin:86px 172px; }
@keyframes plank-torso { 0%,100%{transform:rotate(-73deg) translateY(6px)} }
@keyframes plank-arm-l { 0%,100%{transform:rotate(80deg)} }
@keyframes plank-arm-r { 0%,100%{transform:rotate(-80deg)} }
@keyframes plank-forearm-l { 0%,100%{transform:rotate(-78deg)} }
@keyframes plank-forearm-r { 0%,100%{transform:rotate(78deg)} }
@keyframes plank-thigh { 0%,100%{transform:rotate(-17deg)} }
@keyframes plank-shin { 0%,100%{transform:rotate(4deg)} }

/* MOUNTAIN CLIMBERS */
.anim-mountain-climbers #ex-torso,.anim-mountain-climbers #ex-head { animation:mc-torso 1.2s ease-in-out infinite; transform-origin:60px 60px; }
.anim-mountain-climbers #ex-left-upper-arm { animation:mc-arm-l 1.2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-mountain-climbers #ex-right-upper-arm { animation:mc-arm-r 1.2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-mountain-climbers #ex-left-forearm { animation:mc-forearm-l 1.2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-mountain-climbers #ex-right-forearm { animation:mc-forearm-r 1.2s ease-in-out infinite; transform-origin:103px 70px; }
.anim-mountain-climbers #ex-left-thigh { animation:mc-thigh-l 1.2s ease-in-out infinite alternate; transform-origin:44px 128px; }
.anim-mountain-climbers #ex-right-thigh { animation:mc-thigh-r 1.2s ease-in-out infinite alternate; transform-origin:76px 128px; }
.anim-mountain-climbers #ex-left-shin { animation:mc-shin-l 1.2s ease-in-out infinite alternate; transform-origin:34px 172px; }
.anim-mountain-climbers #ex-right-shin { animation:mc-shin-r 1.2s ease-in-out infinite alternate; transform-origin:86px 172px; }
@keyframes mc-torso { 0%,100%{transform:rotate(-72deg) translateY(8px)} }
@keyframes mc-arm-l { 0%,100%{transform:rotate(80deg)} }
@keyframes mc-arm-r { 0%,100%{transform:rotate(-80deg)} }
@keyframes mc-forearm-l { 0%,100%{transform:rotate(-76deg)} }
@keyframes mc-forearm-r { 0%,100%{transform:rotate(76deg)} }
@keyframes mc-thigh-l { from{transform:rotate(-22deg)} to{transform:rotate(32deg)} }
@keyframes mc-thigh-r { from{transform:rotate(32deg)} to{transform:rotate(-22deg)} }
@keyframes mc-shin-l { from{transform:rotate(-8deg)} to{transform:rotate(-55deg)} }
@keyframes mc-shin-r { from{transform:rotate(-55deg)} to{transform:rotate(-8deg)} }

/* TRICEPS PUSHDOWN */
.anim-triceps-push #ex-left-upper-arm { animation:tp-upper 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-triceps-push #ex-right-upper-arm { animation:tp-upper 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-triceps-push #ex-left-forearm { animation:tp-forearm 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-triceps-push #ex-right-forearm { animation:tp-forearm 2s ease-in-out infinite; transform-origin:103px 70px; }
@keyframes tp-upper { 0%,100%{transform:rotate(18deg)} }
@keyframes tp-forearm { 0%,100%{transform:rotate(-82deg)} 50%{transform:rotate(8deg)} }

/* DIP */
.anim-dip #ex-left-upper-arm { animation:dip-upper-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-dip #ex-right-upper-arm { animation:dip-upper-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-dip #ex-left-forearm { animation:dip-forearm 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-dip #ex-right-forearm { animation:dip-forearm 2s ease-in-out infinite; transform-origin:103px 70px; }
.anim-dip #ex-torso,.anim-dip #ex-head { animation:dip-body 2s ease-in-out infinite; }
@keyframes dip-upper-l { 0%,100%{transform:rotate(-12deg)} 50%{transform:rotate(32deg)} }
@keyframes dip-upper-r { 0%,100%{transform:rotate(12deg)} 50%{transform:rotate(-32deg)} }
@keyframes dip-forearm { 0%,100%{transform:rotate(-52deg)} 50%{transform:rotate(-18deg)} }
@keyframes dip-body { 0%,100%{transform:translateY(-10px)} 50%{transform:translateY(8px)} }

/* FACE PULL */
.anim-face-pull #ex-left-upper-arm { animation:fp-upper-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-face-pull #ex-right-upper-arm { animation:fp-upper-r 2s ease-in-out infinite; transform-origin:92px 32px; }
.anim-face-pull #ex-left-forearm { animation:fp-forearm 2s ease-in-out infinite; transform-origin:17px 70px; }
.anim-face-pull #ex-right-forearm { animation:fp-forearm 2s ease-in-out infinite; transform-origin:103px 70px; }
@keyframes fp-upper-l { 0%,100%{transform:rotate(-45deg)} 50%{transform:rotate(-12deg)} }
@keyframes fp-upper-r { 0%,100%{transform:rotate(45deg)} 50%{transform:rotate(12deg)} }
@keyframes fp-forearm { 0%,100%{transform:rotate(28deg)} 50%{transform:rotate(-18deg)} }

/* TORSO ROTATION */
.anim-torso-rotation #ex-torso { animation:tr-torso 2s ease-in-out infinite; transform-origin:60px 65px; }
.anim-torso-rotation #ex-left-upper-arm { animation:tr-arm-l 2s ease-in-out infinite; transform-origin:28px 32px; }
.anim-torso-rotation #ex-right-upper-arm { animation:tr-arm-r 2s ease-in-out infinite; transform-origin:92px 32px; }
@keyframes tr-torso { 0%,100%{transform:rotate(-22deg) scaleX(0.92)} 50%{transform:rotate(22deg) scaleX(0.92)} }
@keyframes tr-arm-l { 0%,100%{transform:rotate(-15deg)} 50%{transform:rotate(15deg)} }
@keyframes tr-arm-r { 0%,100%{transform:rotate(15deg)} 50%{transform:rotate(-15deg)} }

/* BACK EXTENSION */
.anim-back-extension #ex-torso,.anim-back-extension #ex-head,.anim-back-extension #ex-left-upper-arm,.anim-back-extension #ex-right-upper-arm { animation:be-torso 2s ease-in-out infinite; transform-origin:60px 100px; }
.anim-back-extension #ex-left-thigh { animation:be-thigh 2s ease-in-out infinite; transform-origin:44px 128px; }
.anim-back-extension #ex-right-thigh { animation:be-thigh 2s ease-in-out infinite; transform-origin:76px 128px; }
@keyframes be-torso { 0%,100%{transform:rotate(55deg)} 50%{transform:rotate(22deg)} }
@keyframes be-thigh { 0%,100%{transform:rotate(-5deg)} }

/* Muscle tags */
.ex-anim-muscles { display:flex; flex-wrap:wrap; gap:5px; justify-content:center; margin-top:8px; max-width:280px; }
.ex-muscle-tag { background:rgba(239,68,68,0.18); border:1px solid rgba(239,68,68,0.45); color:#fca5a5; font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; letter-spacing:0.3px; }
`

export function ExerciseAnimation({
  exerciseName,
  isActive = true,
}: {
  exerciseName: string
  isActive?: boolean
}) {
  const { isHebrew } = useI18n()
  const def = useMemo(() => getExerciseDef(exerciseName), [exerciseName])

  const activeMuscleIds = useMemo(() => {
    const ids = new Set<string>()
    def.muscles.forEach(m => MUSCLE_SVG_IDS[m]?.forEach(id => ids.add(id)))
    return ids
  }, [def.muscles])

  const m = (id: string) => `muscle${activeMuscleIds.has(id) ? ' active' : ''}`

  return (
    <div className={`ex-anim-wrap anim-${isActive ? def.anim : 'standing'}`}>
      <style>{CSS}</style>
      <svg viewBox="0 0 120 220" className="ex-anim-svg" xmlns="http://www.w3.org/2000/svg">
        {/* HEAD */}
        <g id="ex-head">
          <circle cx="60" cy="13" r="11" fill="rgba(255,255,255,0.92)" />
          <rect x="56.5" y="23" width="7" height="7" rx="3" fill="rgba(255,255,255,0.85)" />
        </g>

        {/* TORSO */}
        <g id="ex-torso">
          <path d="M27,30 Q60,26 93,30 L84,100 L36,100 Z" fill="rgba(255,255,255,0.88)" />
          {/* Shorts */}
          <path d="M36,100 L84,100 L88,130 L68,130 L60,127 L52,130 L32,130 Z" fill="rgba(160,140,255,0.45)" />
        </g>

        {/* LEFT ARM */}
        <g id="ex-left-upper-arm" style={{ transformOrigin: '28px 32px' }}>
          <path d="M24,30 L15,70 L23,72 L32,32 Z" fill="rgba(255,255,255,0.88)" />
          <g id="ex-left-forearm" style={{ transformOrigin: '17px 70px' }}>
            <path d="M15,70 L11,104 L18,106 L23,72 Z" fill="rgba(255,255,255,0.84)" />
            <ellipse cx="13" cy="108" rx="4" ry="3" fill="rgba(255,255,255,0.8)" />
          </g>
        </g>

        {/* RIGHT ARM */}
        <g id="ex-right-upper-arm" style={{ transformOrigin: '92px 32px' }}>
          <path d="M88,30 L97,70 L105,72 L96,32 Z" fill="rgba(255,255,255,0.88)" />
          <g id="ex-right-forearm" style={{ transformOrigin: '103px 70px' }}>
            <path d="M97,70 L101,104 L108,106 L105,72 Z" fill="rgba(255,255,255,0.84)" />
            <ellipse cx="107" cy="108" rx="4" ry="3" fill="rgba(255,255,255,0.8)" />
          </g>
        </g>

        {/* LEFT LEG */}
        <g id="ex-left-thigh" style={{ transformOrigin: '44px 130px' }}>
          <path d="M36,128 L30,172 L40,174 L48,130 Z" fill="rgba(255,255,255,0.88)" />
          <g id="ex-left-shin" style={{ transformOrigin: '34px 172px' }}>
            <path d="M30,172 L28,204 L37,206 L40,174 Z" fill="rgba(255,255,255,0.84)" />
            <path d="M25,204 L37,206 L38,212 L23,211 Z" fill="rgba(255,255,255,0.75)" />
          </g>
        </g>

        {/* RIGHT LEG */}
        <g id="ex-right-thigh" style={{ transformOrigin: '76px 130px' }}>
          <path d="M84,128 L90,172 L80,174 L72,130 Z" fill="rgba(255,255,255,0.88)" />
          <g id="ex-right-shin" style={{ transformOrigin: '86px 172px' }}>
            <path d="M90,172 L92,204 L83,206 L80,174 Z" fill="rgba(255,255,255,0.84)" />
            <path d="M95,204 L83,206 L82,212 L97,211 Z" fill="rgba(255,255,255,0.75)" />
          </g>
        </g>

        {/* MUSCLE OVERLAYS */}
        <path id="m-chest-l"    className={m('m-chest-l')}    d="M27,30 L60,30 L58,62 L33,65 L25,48 Z" />
        <path id="m-chest-r"    className={m('m-chest-r')}    d="M60,30 L93,30 L95,48 L87,65 L62,62 Z" />
        <path id="m-delt-l"     className={m('m-delt-l')}     d="M19,27 L32,27 L28,50 L17,44 Z" />
        <path id="m-delt-r"     className={m('m-delt-r')}     d="M88,27 L101,27 L103,44 L92,50 Z" />
        <path id="m-bicep-l"    className={m('m-bicep-l')}    d="M24,34 L16,65 L21,66 L29,35 Z" />
        <path id="m-bicep-r"    className={m('m-bicep-r')}    d="M91,34 L99,65 L104,66 L96,35 Z" />
        <path id="m-tricep-l"   className={m('m-tricep-l')}   d="M22,32 L13,65 L18,67 L27,33 Z" />
        <path id="m-tricep-r"   className={m('m-tricep-r')}   d="M93,32 L102,65 L107,67 L98,33 Z" />
        <path id="m-forearm-l"  className={m('m-forearm-l')}  d="M15,70 L11,103 L17,105 L22,72 Z" />
        <path id="m-forearm-r"  className={m('m-forearm-r')}  d="M98,70 L102,103 L108,105 L103,72 Z" />
        <path id="m-upper-abs"  className={m('m-upper-abs')}  d="M40,62 L80,62 L78,80 L42,80 Z" />
        <path id="m-lower-abs"  className={m('m-lower-abs')}  d="M42,80 L78,80 L76,98 L44,98 Z" />
        <path id="m-oblique-l"  className={m('m-oblique-l')}  d="M26,55 L40,60 L42,96 L30,92 L23,70 Z" />
        <path id="m-oblique-r"  className={m('m-oblique-r')}  d="M94,55 L80,60 L78,96 L90,92 L97,70 Z" />
        <path id="m-lat-l"      className={m('m-lat-l')}      d="M24,38 L35,55 L37,96 L28,92 L20,50 Z" />
        <path id="m-lat-r"      className={m('m-lat-r')}      d="M96,38 L85,55 L83,96 L92,92 L100,50 Z" />
        <path id="m-upper-back" className={m('m-upper-back')} d="M30,30 L90,30 L86,52 L34,52 Z" />
        <path id="m-lower-back" className={m('m-lower-back')} d="M36,70 L84,70 L82,98 L38,98 Z" />
        <path id="m-trap-l"     className={m('m-trap-l')}     d="M30,27 L60,30 L56,44 L36,41 Z" />
        <path id="m-trap-r"     className={m('m-trap-r')}     d="M60,30 L90,27 L84,41 L64,44 Z" />
        <path id="m-glute"      className={m('m-glute')}      d="M36,100 L84,100 L88,128 L32,128 Z" />
        <path id="m-quad-l"     className={m('m-quad-l')}     d="M40,130 L50,130 L46,170 L36,168 Z" />
        <path id="m-quad-r"     className={m('m-quad-r')}     d="M70,130 L80,130 L84,168 L74,170 Z" />
        <path id="m-ham-l"      className={m('m-ham-l')}      d="M34,130 L42,130 L38,170 L29,167 Z" />
        <path id="m-ham-r"      className={m('m-ham-r')}      d="M78,130 L86,130 L91,167 L82,170 Z" />
        <path id="m-calf-l"     className={m('m-calf-l')}     d="M30,174 L40,174 L38,202 L28,200 Z" />
        <path id="m-calf-r"     className={m('m-calf-r')}     d="M80,174 L90,174 L92,200 L82,202 Z" />
      </svg>

      <div className="ex-anim-muscles">
        {def.muscles.map(muscle => (
          <span key={muscle} className="ex-muscle-tag">
            {isHebrew ? MUSCLE_LABEL[muscle][1] : MUSCLE_LABEL[muscle][0]}
          </span>
        ))}
      </div>
    </div>
  )
}
