/**
 * gymExercises.ts
 * Static fallback exercise list for the Gym Workout Builder.
 * Loaded when the ExerciseDB / wger API is unavailable.
 *
 * Exercise names have been aligned with ExerciseDB search terms so that
 * `apiName` (when present) can be used as a more precise search key.
 */

export type GymFocus = 'full' | 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs'

export interface GymExerciseTemplate {
  /** Optional override name for ExerciseDB/wger API lookup */
  apiName?: string
  equipment: string
  equipmentHe: string
  focus: GymFocus
  id: string
  imageUrl?: string
  instruction: string
  instructionHe: string
  name: string
  nameHe: string
}

export const GYM_EXERCISES_FALLBACK: GymExerciseTemplate[] = [
  // ── Full body ────────────────────────────────────────────────────────────────
  { id: 'leg-press', focus: 'full', name: 'Leg Press', nameHe: 'לחיצת רגליים במכונה', equipment: 'Leg press machine', equipmentHe: 'מכונת לחיצת רגליים', instruction: 'Set the seat so your knees bend comfortably, press through the full foot, and avoid locking the knees.', instructionHe: 'כוון את המושב כך שהברכיים יתכופפו בנוחות, דחוף דרך כל כף הרגל ואל תנעל ברכיים.' },
  { id: 'lat-pulldown', focus: 'full', name: 'Lat Pulldown', nameHe: 'פולי עליון לגב', equipment: 'Lat pulldown cable machine', equipmentHe: 'מכונת פולי עליון', instruction: 'Pull the bar toward the upper chest with shoulders down and controlled return.', instructionHe: 'משוך את המוט לכיוון החזה העליון כשהכתפיים נמוכות וחזור בשליטה.' },
  { id: 'chest-press', focus: 'full', name: 'Chest Press Machine', nameHe: 'מכונת לחיצת חזה', equipment: 'Chest press machine', equipmentHe: 'מכונת לחיצת חזה', instruction: 'Keep shoulder blades back, press forward smoothly, and stop before the elbows lock.', instructionHe: 'שמור שכמות לאחור, לחץ קדימה בצורה חלקה ועצור לפני נעילת מרפקים.' },
  { id: 'cable-row', focus: 'full', name: 'Seated Cable Row', nameHe: 'חתירה בישיבה בכבל', equipment: 'Seated cable row', equipmentHe: 'כבל חתירה בישיבה', instruction: 'Sit tall, pull elbows toward the ribs, and keep the torso stable.', instructionHe: 'שב זקוף, משוך מרפקים לכיוון הצלעות ושמור גוף יציב.' },
  { id: 'machine-shoulder-press', focus: 'full', name: 'Shoulder Press Machine', nameHe: 'מכונת לחיצת כתפיים', equipment: 'Shoulder press machine', equipmentHe: 'מכונת לחיצת כתפיים', instruction: 'Start with handles around shoulder height and press without arching the lower back.', instructionHe: 'התחל כשהידיות בגובה הכתפיים ולחץ בלי להקשית את הגב התחתון.' },

  // ── Chest ────────────────────────────────────────────────────────────────────
  { id: 'incline-db-press', focus: 'chest', name: 'Incline Dumbbell Press', nameHe: 'לחיצת חזה בשיפוע עם משקולות', equipment: 'Incline bench and dumbbells', equipmentHe: 'ספסל שיפוע ומשקולות', instruction: 'Use a moderate incline, lower the dumbbells with control, and press on a steady path.', instructionHe: 'השתמש בשיפוע מתון, הורד את המשקולות בשליטה ולחץ במסלול יציב.' },
  { id: 'cable-fly', focus: 'chest', name: 'Cable Fly', nameHe: 'פרפר בכבלים', equipment: 'Cable crossover', equipmentHe: 'קרוס כבלים', instruction: 'Keep a soft elbow bend and bring the hands together without shrugging.', instructionHe: 'שמור כיפוף קל במרפקים וקרב ידיים בלי להרים כתפיים.' },
  { id: 'pec-deck', focus: 'chest', name: 'Pec Deck', nameHe: 'פרפר חזה במכונה', equipment: 'Pec deck machine', equipmentHe: 'מכונת פרפר חזה', instruction: 'Adjust the handles to chest height and squeeze the chest at the center.', instructionHe: 'כוון ידיות לגובה החזה וכווץ את החזה במרכז התנועה.' },

  // ── Back ─────────────────────────────────────────────────────────────────────
  // "Single Arm Cable Row" → "Cable Row"  (apiName used for ExerciseDB lookup)
  { id: 'single-arm-row', focus: 'back', apiName: 'cable seated row', name: 'Cable Row', nameHe: 'חתירה בכבל', equipment: 'Cable station', equipmentHe: 'עמדת כבלים', instruction: 'Pull one elbow back at a time and keep the ribs stacked over the hips.', instructionHe: 'משוך מרפק אחד לאחור בכל פעם ושמור צלעות מעל האגן.' },
  // "Chest Supported Row" → "Bent Over Row"
  { id: 'chest-supported-row', focus: 'back', name: 'Bent Over Row', nameHe: 'חתירה מכופף', equipment: 'Row machine or incline bench', equipmentHe: 'מכונת חתירה או ספסל שיפוע', instruction: 'Rest the chest on the pad and pull with the upper back, not momentum.', instructionHe: 'הישען עם החזה על הריפוד ומשוך עם הגב העליון, לא עם תנופה.' },
  { id: 'back-extension', focus: 'back', name: 'Back Extension', nameHe: 'פשיטת גב', equipment: 'Back extension bench', equipmentHe: 'ספסל פשיטת גב', instruction: 'Move slowly through a comfortable range and keep the neck neutral.', instructionHe: 'עבוד לאט בטווח נוח ושמור צוואר ניטרלי.' },

  // ── Legs ─────────────────────────────────────────────────────────────────────
  { id: 'leg-curl', focus: 'legs', name: 'Seated Leg Curl', nameHe: 'כפיפת ברך בישיבה', equipment: 'Seated leg curl machine', equipmentHe: 'מכונת כפיפת ברך', instruction: 'Line up the knee with the machine pivot and curl without lifting the hips.', instructionHe: 'יישר את הברך עם ציר המכונה וכפוף בלי להרים אגן.' },
  { id: 'leg-extension', focus: 'legs', name: 'Leg Extension', nameHe: 'פשיטת ברך במכונה', equipment: 'Leg extension machine', equipmentHe: 'מכונת פשיטת ברך', instruction: 'Lift under control, pause briefly, and lower without swinging.', instructionHe: 'הרם בשליטה, עצור קצר, והורד בלי תנופה.' },
  { id: 'smith-squat', focus: 'legs', name: 'Smith Machine Squat', nameHe: 'סקוואט בסמית', equipment: 'Smith machine', equipmentHe: 'מכונת סמית', instruction: 'Place feet where the movement feels stable and keep the knees tracking over the toes.', instructionHe: 'מקם רגליים במקום יציב ושמור ברכיים בכיוון האצבעות.' },
  { id: 'calf-raise', focus: 'legs', name: 'Standing Calf Raise', nameHe: 'עליות תאומים במכונה', equipment: 'Calf raise machine', equipmentHe: 'מכונת תאומים', instruction: 'Rise high onto the toes, pause, then lower slowly.', instructionHe: 'עלה גבוה על קצות האצבעות, עצור, ואז רד לאט.' },

  // ── Shoulders ────────────────────────────────────────────────────────────────
  { id: 'cable-lateral-raise', focus: 'shoulders', name: 'Cable Lateral Raise', nameHe: 'הרחקת כתף בכבל', equipment: 'Low cable pulley', equipmentHe: 'פולי תחתון', instruction: 'Raise to shoulder height with a soft elbow and slow return.', instructionHe: 'הרם עד גובה כתף עם מרפק רך וחזור לאט.' },
  { id: 'face-pull', focus: 'shoulders', name: 'Face Pull', nameHe: 'משיכת פנים בכבל', equipment: 'Cable rope', equipmentHe: 'חבל בכבל', instruction: 'Pull the rope toward eye level and rotate the hands slightly outward.', instructionHe: 'משוך את החבל לגובה העיניים וסובב ידיים מעט החוצה.' },
  // "Rear Delt Machine" → "Face Pull"  (apiName for ExerciseDB lookup)
  { id: 'rear-delt-machine', focus: 'shoulders', apiName: 'cable face pull', name: 'Face Pull', nameHe: 'משיכת פנים בכבל', equipment: 'Rear delt machine', equipmentHe: 'מכונת כתף אחורית', instruction: 'Keep the chest supported and open the arms with control.', instructionHe: 'שמור חזה נתמך ופתח ידיים בשליטה.' },

  // ── Arms ─────────────────────────────────────────────────────────────────────
  { id: 'triceps-pushdown', focus: 'arms', name: 'Cable Triceps Pushdown', nameHe: 'פשיטת מרפקים בכבל', equipment: 'Cable rope or bar', equipmentHe: 'חבל או מוט בכבל', instruction: 'Keep elbows close to the ribs and press down without leaning.', instructionHe: 'שמור מרפקים קרובים לצלעות ולחץ מטה בלי להישען.' },
  { id: 'preacher-curl', focus: 'arms', name: 'Preacher Curl Machine', nameHe: 'כפיפת מרפקים במכונת פריצ׳ר', equipment: 'Preacher curl machine', equipmentHe: 'מכונת פריצ׳ר', instruction: 'Keep the upper arms on the pad and curl through a smooth range.', instructionHe: 'שמור זרועות על הכרית וכפוף בטווח חלק.' },
  { id: 'hammer-curl', focus: 'arms', name: 'Dumbbell Hammer Curl', nameHe: 'כפיפת פטיש עם משקולות', equipment: 'Dumbbells', equipmentHe: 'משקולות יד', instruction: 'Curl with palms facing each other and avoid swinging the torso.', instructionHe: 'כפוף כשהכפות פונות זו לזו והימנע מתנופת גוף.' },

  // ── Abs ──────────────────────────────────────────────────────────────────────
  { id: 'cable-crunch',       focus: 'abs',       name: 'Cable Crunch',              nameHe: 'כפיפות בטן בכבל',         equipment: 'Cable rope',                  equipmentHe: 'חבל בכבל',                  instruction: 'Round the upper back gently toward the hips and avoid pulling with the arms.', instructionHe: 'עגל את הגב העליון בעדינות לכיוון האגן ואל תמשוך עם הידיים.' },
  { id: 'hanging-knee-raise', focus: 'abs',       name: 'Hanging Knee Raise',        nameHe: 'הרמת ברכיים בתלייה',       equipment: 'Captain chair or pull-up bar', equipmentHe: 'כיסא קפטן או מוט מתח',    instruction: 'Lift knees with control and stop if the lower back feels uncomfortable.', instructionHe: 'הרם ברכיים בשליטה ועצור אם הגב התחתון לא נוח.' },
  // "Torso Rotation Machine" → "Russian Twist"
  { id: 'torso-rotation',     focus: 'abs',       apiName: 'russian twist', name: 'Russian Twist',              nameHe: 'רוטציה רוסית',                equipment: 'Torso rotation machine',      equipmentHe: 'מכונת רוטציה',             instruction: 'Use a light load and rotate through a controlled, pain-free range.', instructionHe: 'בחר משקל קל וסובב בטווח נשלט וללא כאב.' },
  { id: 'ab-wheel',           focus: 'abs',       name: 'Ab Wheel Rollout',          nameHe: 'גלגל בטן',                 equipment: 'Ab wheel',                    equipmentHe: 'גלגל בטן',                  instruction: 'Roll out slowly keeping hips down and return without arching.', instructionHe: 'גלגלו לאט תוך שמירת אגן נמוך וחזרו בלי להקשית.' },

  // ── Additional full-body ─────────────────────────────────────────────────────
  { id: 'romanian-deadlift',   focus: 'full',      name: 'Romanian Deadlift',         nameHe: 'דדליפט רומני',              equipment: 'Barbell or dumbbells',        equipmentHe: 'בר או משקולות',             instruction: 'Hinge at the hips, push them back and lower the weight along your legs.', instructionHe: 'דחפו את האגן לאחור והורידו את המשקל לאורך הרגליים.' },
  { id: 'pull-up',             focus: 'full',      name: 'Pull-Up',                   nameHe: 'מתח',                       equipment: 'Pull-up bar',                 equipmentHe: 'מוט מתח',                   instruction: 'Start from a dead hang and pull your chest to the bar.', instructionHe: 'התחילו מתלייה מלאה ומשכו את החזה לכיוון המוט.' },
  { id: 'chin-up',             focus: 'back',      name: 'Chin-Up',                   nameHe: 'צ׳ין-אפ (אחיזה הפוכה)',     equipment: 'Pull-up bar',                 equipmentHe: 'מוט מתח',                   instruction: 'Supinated grip, pull up until chin clears the bar.', instructionHe: 'אחיזה הפוכה, משכו עד שהסנטר עולה מעל המוט.' },
  { id: 't-bar-row',           focus: 'back',      name: 'T-Bar Row',                 nameHe: 'חתירה טי-בר',               equipment: 'T-bar row machine',           equipmentHe: 'מכונת חתירה טי-בר',         instruction: 'Hinge over the bar and pull with elbows close to the body.', instructionHe: 'הטו מעל המוט ומשכו עם המרפקים קרובים לגוף.' },
  // "Lat Pullover Machine" → "Pullover"  (apiName for ExerciseDB lookup)
  { id: 'lat-pullover',        focus: 'back',      apiName: 'dumbbell pullover', name: 'Pullover',                    nameHe: 'פולאובר',                       equipment: 'Lat pullover machine',        equipmentHe: 'מכונת פולאובר',             instruction: 'Extend arms overhead and pull down through a full arc, squeezing lats.', instructionHe: 'פשטו ידיים מעל הראש ומשכו למטה בקשת מלאה, סחטו גב.' },

  { id: 'hack-squat',          focus: 'legs',      name: 'Hack Squat',                nameHe: 'סקוואט האק',                equipment: 'Hack squat machine',          equipmentHe: 'מכונת האק סקוואט',          instruction: 'Keep back against the pad, lower until thighs are parallel and drive through heels.', instructionHe: 'שמרו גב על הכרית, רדו עד שהירכיים מקבילות ודחפו דרך העקבים.' },
  { id: 'hip-abduction',       focus: 'legs',      name: 'Hip Abduction Machine',     nameHe: 'מכונת הרחקת ירך',           equipment: 'Hip abduction machine',       equipmentHe: 'מכונת הרחקת ירך',           instruction: 'Push knees outward against the pads with controlled movement.', instructionHe: 'דחפו ברכיים החוצה כנגד הכריות בתנועה מבוקרת.' },
  { id: 'hip-adduction',       focus: 'legs',      name: 'Hip Adduction Machine',     nameHe: 'מכונת קירוב ירך',           equipment: 'Hip adduction machine',       equipmentHe: 'מכונת קירוב ירך',           instruction: 'Squeeze knees together against resistance and release slowly.', instructionHe: 'סחטו ברכיים יחד כנגד ההתנגדות ושחררו לאט.' },
  { id: 'seated-calf-raise-m', focus: 'legs',      name: 'Seated Calf Raise Machine', nameHe: 'מכונת עליות תאומים ישיבה',  equipment: 'Seated calf raise machine',   equipmentHe: 'מכונת עליות תאומים ישיבה',  instruction: 'Full range: rise high, pause, and lower slowly below the step.', instructionHe: 'טווח מלא: עלו גבוה, עצרו, ורדו לאט מתחת למדרגה.' },

  { id: 'arnold-press',        focus: 'shoulders', name: 'Arnold Press',              nameHe: 'לחיצת ארנולד',              equipment: 'Dumbbells',                   equipmentHe: 'משקולות',                   instruction: 'Start with palms facing you, rotate and press overhead, reverse on the way down.', instructionHe: 'התחלו עם כפות לכיוונכם, סובבו ולחצו מעלה, הפכו בדרך למטה.' },
  { id: 'dumbbell-lateral',    focus: 'shoulders', name: 'Dumbbell Lateral Raise',    nameHe: 'הרחקת כתף עם משקולות',      equipment: 'Dumbbells',                   equipmentHe: 'משקולות',                   instruction: 'Slight forward lean, raise to shoulder height with a soft elbow.', instructionHe: 'נטייה קלה קדימה, הרימו לגובה כתף עם מרפק רך.' },
  { id: 'front-raise',         focus: 'shoulders', name: 'Front Raise',               nameHe: 'הרמת ידיים קדמית',          equipment: 'Dumbbells or plate',          equipmentHe: 'משקולות או צלחת',           instruction: 'Raise one or both arms straight in front to shoulder height.', instructionHe: 'הרימו יד אחת או שתיים ישירות קדימה לגובה הכתף.' },

  { id: 'cable-curl',          focus: 'arms',      name: 'Cable Curl',                nameHe: 'כפיפת מרפקים בכבל',         equipment: 'Low cable pulley',            equipmentHe: 'פולי תחתון',                instruction: 'Keep elbows pinned and curl the cable bar to shoulder level.', instructionHe: 'קבעו מרפקים וכופפו את מוט הכבל לגובה הכתף.' },
  { id: 'overhead-triceps',    focus: 'arms',      name: 'Overhead Triceps Extension', nameHe: 'פשיטת מרפקים מעל הראש',   equipment: 'Cable or dumbbell',           equipmentHe: 'כבל או משקולת',             instruction: 'Hold weight behind head, extend elbows upward, keep upper arms still.', instructionHe: 'החזיקו משקל מאחורי הראש, פשטו מרפקים מעלה, שמרו זרועות יציבות.' },
  { id: 'ez-bar-curl',         focus: 'arms',      name: 'EZ-Bar Curl',               nameHe: 'כפיפת מרפקים עם בר EZ',     equipment: 'EZ curl bar',                 equipmentHe: 'בר EZ',                     instruction: 'Use a semi-supinated grip and curl through full range without swinging.', instructionHe: 'השתמשו באחיזה חצי-הפוכה וכופפו בטווח מלא בלי תנופה.' },
  { id: 'close-grip-press',    focus: 'chest',     name: 'Close-Grip Bench Press',    nameHe: 'לחיצת חזה אחיזה צרה',       equipment: 'Barbell or Smith machine',    equipmentHe: 'בר או מכונת סמית',          instruction: 'Grip inside shoulder-width, lower to lower chest and press up.', instructionHe: 'אחיזה בתוך רוחב כתפיים, הורידו לחזה תחתון ולחצו מעלה.' },
]
