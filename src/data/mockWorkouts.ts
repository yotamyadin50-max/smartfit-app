export type WorkoutCategory = 'goal' | 'abs' | 'arms' | 'legs' | 'back' | 'chest' | 'gym'
export type AerobicType = 'run' | 'walk' | 'bike' | 'stairs'

export interface ExerciseCoachingDetails {
  aiTip: string
  aiTipHe: string
  commonMistakes: string[]
  commonMistakesHe: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  executionSteps: string[]
  executionStepsHe: string[]
  goal: string
  goalHe: string
  machineUse?: string[]
  machineUseHe?: string[]
  primaryMuscle: string
  primaryMuscleHe: string
  secondaryMuscles: string[]
  secondaryMusclesHe: string[]
  tempo: string
  tempoHe: string
  tips: string[]
  tipsHe: string[]
}

export interface Exercise {
  id: string
  name: string
  nameHe: string
  sets: number
  reps: number
  durationSeconds?: number
  restSeconds: number
  instruction: string
  instructionHe: string
  coaching?: ExerciseCoachingDetails
  imageUrl?: string
}

export interface Workout {
  id: string
  category: WorkoutCategory
  name: string
  nameHe: string
  durationMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  type: 'strength' | 'cardio' | 'hiit' | 'flexibility'
  targetMuscles: string[]
  summary: string
  summaryHe: string
  exercises: Exercise[]
}

export interface AerobicWorkout {
  id: string
  type: AerobicType
  name: string
  nameHe: string
  durationMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  baseDistanceKm: number
  baseCalories: number
  avgPace: string
  avgHeartRate: number
  summary: string
  summaryHe: string
}

export const mockWorkouts: Workout[] = [

  // ── GOAL ────────────────────────────────────────────────────────────────────
  {
    id: 'goal-strength',
    category: 'goal',
    name: 'Goal-Based Full Body',
    nameHe: 'אימון לפי מטרה לכל הגוף',
    durationMinutes: 45,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['chest', 'back', 'legs', 'core', 'shoulders'],
    summary: 'Balanced strength session matched to your current profile goal.',
    summaryHe: 'אימון כוח מאוזן שמתאים למטרה שבחרת בפרופיל.',
    exercises: [
      { id: 'goal-1', name: 'Squats',            nameHe: 'סקוואטים',          sets: 3, reps: 12, restSeconds: 60, instruction: 'Stand with feet shoulder-width apart. Lower until thighs are parallel, then push back up.', instructionHe: 'עמדו ברוחב כתפיים, רדו עד שהירכיים מקבילות לרצפה ועלו חזרה בשליטה.' },
      { id: 'goal-2', name: 'Push-Ups',          nameHe: 'שכיבות סמיכה',      sets: 3, reps: 10, restSeconds: 45, instruction: 'Keep a straight plank line and lower your chest with elbows around 45 degrees.', instructionHe: 'שמרו על קו גוף ישר, רדו עם החזה כשהמרפקים בזווית נוחה ועלו חזרה.' },
      { id: 'goal-3', name: 'Dumbbell Rows',     nameHe: 'חתירה עם משקולות',  sets: 3, reps: 12, restSeconds: 60, instruction: 'Hinge at the hips, pull toward your hip, and keep your back flat.', instructionHe: 'הטו את הגוף מהירך, משכו את המשקולת לכיוון האגן ושמרו על גב ישר.' },
      { id: 'goal-4', name: 'Plank',             nameHe: 'פלאנק',             sets: 3, reps: 30, durationSeconds: 30, restSeconds: 30, instruction: 'Hold a straight line from head to heels and breathe steadily.', instructionHe: 'שמרו על קו ישר מהראש עד העקבים ונשמו בקצב יציב.' },
      { id: 'goal-5', name: 'Reverse Lunge',     nameHe: 'לאנג׳ לאחור',       sets: 3, reps: 10, restSeconds: 45, instruction: 'Step back and lower the back knee toward the floor, then return.', instructionHe: 'צעדו לאחור ורדו עם הברך האחורית לכיוון הרצפה, אחר כך חזרו.' },
      { id: 'goal-6', name: 'Pike Push-Up',      nameHe: 'שכיבת סמיכה פייק',  sets: 3, reps: 8,  restSeconds: 45, instruction: 'From downward dog position, bend elbows to lower your head toward the floor.', instructionHe: 'מתנוחת כלב כפוף, כופפו מרפקים וקרבו ראש לרצפה.' },
      { id: 'goal-7', name: 'Jump Squat',        nameHe: 'סקוואט קפיצה',      sets: 3, reps: 10, restSeconds: 60, instruction: 'Squat then explode upward, land softly and go right into the next rep.', instructionHe: 'צנחו לסקוואט ואחר כך קפצו למעלה, נחתו ברכות וחזרו לתנועה הבאה.' },
    ],
  },

  // ── ABS ─────────────────────────────────────────────────────────────────────
  {
    id: 'abs-core',
    category: 'abs',
    name: 'Core & Abs Focus',
    nameHe: 'אימון בטן וליבה',
    durationMinutes: 25,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['abs', 'obliques', 'core'],
    summary: 'Core stability, lower abs, obliques, and controlled trunk work.',
    summaryHe: 'עבודה על יציבות ליבה, בטן תחתונה, אלכסוניים ושליטה בגוף.',
    exercises: [
      { id: 'abs-1', name: 'Dead Bug',          nameHe: 'דד באג',             sets: 3, reps: 12, restSeconds: 30, instruction: 'Keep your lower back down while alternating opposite arm and leg.', instructionHe: 'הצמידו גב תחתון לרצפה והחליפו יד ורגל נגדית בשליטה.' },
      { id: 'abs-2', name: 'Reverse Crunch',    nameHe: 'כפיפות בטן הפוכות', sets: 3, reps: 14, restSeconds: 35, instruction: 'Curl hips toward your ribs without swinging your legs.', instructionHe: 'קרבו את האגן לכיוון הצלעות בלי תנופה מהרגליים.' },
      { id: 'abs-3', name: 'Side Plank',        nameHe: 'פלאנק צד',           sets: 2, reps: 30, durationSeconds: 30, restSeconds: 30, instruction: 'Stack shoulders and hips, then hold each side with a tight core.', instructionHe: 'יישרו כתפיים ואגן והחזיקו כל צד עם ליבה אסופה.' },
      { id: 'abs-4', name: 'Mountain Climbers', nameHe: 'מטפס הרים',          sets: 3, reps: 20, restSeconds: 30, instruction: 'Drive knees forward from plank while keeping hips low.', instructionHe: 'מתנוחת פלאנק הביאו ברכיים קדימה בקצב, ושמרו אגן נמוך.' },
      { id: 'abs-5', name: 'Bicycle Crunch',    nameHe: 'כפיפות אופניים',    sets: 3, reps: 20, restSeconds: 30, instruction: 'Rotate elbow to opposite knee while fully extending the other leg.', instructionHe: 'סובבו מרפק לברך הנגדית תוך פשיטת הרגל השנייה לגמרי.' },
      { id: 'abs-6', name: 'Leg Raises',        nameHe: 'הרמות רגליים',       sets: 3, reps: 12, restSeconds: 35, instruction: 'Lie flat, press lower back to the floor and raise legs to 90 degrees.', instructionHe: 'שכבו שטוח, הצמידו גב תחתון לרצפה והרימו רגליים ל-90 מעלות.' },
      { id: 'abs-7', name: 'Russian Twist',     nameHe: 'טוויסט רוסי',       sets: 3, reps: 20, restSeconds: 30, instruction: 'Lean back at 45 degrees and rotate the torso side to side.', instructionHe: 'הישענו לאחור ב-45 מעלות וסובבו את הגוף מצד לצד.' },
      { id: 'abs-8', name: 'Hollow Hold',       nameHe: 'החזקת חלול',        sets: 3, reps: 30, durationSeconds: 30, restSeconds: 35, instruction: 'Press your lower back to the floor, lift shoulders and legs slightly and hold.', instructionHe: 'הצמידו גב תחתון לרצפה, הרימו כתפיים ורגליים מעט והחזיקו.' },
    ],
  },

  // ── ARMS ────────────────────────────────────────────────────────────────────
  {
    id: 'arms-upper',
    category: 'arms',
    name: 'Arms Strength',
    nameHe: 'אימון ידיים',
    durationMinutes: 30,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['biceps', 'triceps', 'shoulders', 'forearms'],
    summary: 'Complete upper-arm session — biceps, triceps, shoulders and grip.',
    summaryHe: 'אימון מלא לפלג עליון — בייספס, טרייספס, כתפיים ואחיזה.',
    exercises: [
      { id: 'arms-1', name: 'Biceps Curl',                nameHe: 'כפיפת מרפקים',           sets: 3, reps: 12, restSeconds: 45, instruction: 'Keep elbows close to your body and curl without swinging.', instructionHe: 'שמרו מרפקים קרובים לגוף והרימו בלי תנופה.' },
      { id: 'arms-2', name: 'Triceps Dips',               nameHe: 'דיפס ליד אחורית',         sets: 3, reps: 10, restSeconds: 45, instruction: 'Lower with control, then press through your palms.', instructionHe: 'רדו בשליטה ודחפו דרך כפות הידיים לעלייה.' },
      { id: 'arms-3', name: 'Shoulder Press',             nameHe: 'לחיצת כתפיים',           sets: 3, reps: 10, restSeconds: 60, instruction: 'Press weights overhead while keeping ribs down.', instructionHe: 'לחצו מעל הראש ושמרו צלעות אסופות.' },
      { id: 'arms-4', name: 'Close-Grip Push-Up',         nameHe: 'שכיבת סמיכה צרה',        sets: 2, reps: 8,  restSeconds: 45, instruction: 'Place hands under shoulders and keep elbows close.', instructionHe: 'מקמו ידיים מתחת לכתפיים ושמרו מרפקים קרובים.' },
      { id: 'arms-5', name: 'Hammer Curl',                nameHe: 'כפיפת פטיש',             sets: 3, reps: 12, restSeconds: 45, instruction: 'Curl with palms facing each other — avoid swinging the torso.', instructionHe: 'כופפו כשהכפות פונות זו לזו — הימנעו מתנופת גוף.' },
      { id: 'arms-6', name: 'Overhead Triceps Extension', nameHe: 'פשיטת מרפקים מעל הראש', sets: 3, reps: 12, restSeconds: 45, instruction: 'Hold weight behind head, extend elbows up while keeping upper arms still.', instructionHe: 'החזיקו משקל מאחורי הראש, פשטו מרפקים מעלה כשהזרועות יציבות.' },
      { id: 'arms-7', name: 'Lateral Raise',              nameHe: 'הרחקת ידיים לצדדים',    sets: 3, reps: 14, restSeconds: 40, instruction: 'Raise arms to shoulder height with a slight bend at the elbow.', instructionHe: 'הרימו ידיים לגובה הכתפיים עם כיפוף קל במרפק.' },
      { id: 'arms-8', name: 'Concentration Curl',         nameHe: 'כפיפת ריכוז',            sets: 3, reps: 10, restSeconds: 40, instruction: 'Elbow braced against inner thigh, curl the dumbbell with full control.', instructionHe: 'מרפק נשען על הירך הפנימית, כופפו את המשקולת בשליטה מלאה.' },
    ],
  },

  // ── LEGS ────────────────────────────────────────────────────────────────────
  {
    id: 'legs-lower',
    category: 'legs',
    name: 'Leg Day',
    nameHe: 'אימון רגליים',
    durationMinutes: 35,
    difficulty: 'hard',
    type: 'strength',
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    summary: 'Lower-body strength with squats, lunges, glute work and calf raises.',
    summaryHe: 'אימון כוח לרגליים עם סקוואטים, לאנג׳ים, עבודת ישבן ותאומים.',
    exercises: [
      { id: 'legs-1', name: 'Goblet Squat',          nameHe: 'סקוואט גביע',       sets: 4, reps: 10, restSeconds: 60, instruction: 'Hold weight close to your chest and sit between your knees.', instructionHe: 'החזיקו משקל קרוב לחזה ורדו בין הברכיים.' },
      { id: 'legs-2', name: 'Reverse Lunge',         nameHe: 'לאנג׳ לאחור',       sets: 3, reps: 10, restSeconds: 45, instruction: 'Step back, lower softly, and drive through the front heel.', instructionHe: 'צעדו לאחור, רדו ברכות ודחפו דרך העקב הקדמי.' },
      { id: 'legs-3', name: 'Glute Bridge',          nameHe: 'גשר ישבן',          sets: 3, reps: 14, restSeconds: 35, instruction: 'Press hips up and squeeze glutes at the top.', instructionHe: 'הרימו אגן וסחטו ישבן בחלק העליון.' },
      { id: 'legs-4', name: 'Calf Raises',           nameHe: 'עליות תאומים',      sets: 3, reps: 18, restSeconds: 30, instruction: 'Rise onto your toes, pause, then lower slowly.', instructionHe: 'עלו לקצות האצבעות, עצרו רגע ורדו לאט.' },
      { id: 'legs-5', name: 'Bulgarian Split Squat', nameHe: 'סקוואט בולגרי',     sets: 3, reps: 8,  restSeconds: 60, instruction: 'Rear foot elevated, lower until front thigh is parallel to the floor.', instructionHe: 'רגל אחורית מורמת, רדו עד שהירך הקדמית מקבילה לרצפה.' },
      { id: 'legs-6', name: 'Hip Thrust',            nameHe: 'הרמת אגן',          sets: 3, reps: 14, restSeconds: 45, instruction: 'Upper back on bench, drive hips up and squeeze glutes hard at the top.', instructionHe: 'גב עליון על ספסל, הרימו אגן וסחטו ישבן חזק בחלק העליון.' },
      { id: 'legs-7', name: 'Wall Sit',              nameHe: 'ישיבת קיר',         sets: 3, reps: 40, durationSeconds: 40, restSeconds: 45, instruction: 'Back flat against the wall, thighs parallel to the floor, hold.', instructionHe: 'גב צמוד לקיר, ירכיים מקבילות לרצפה, החזיקו.' },
      { id: 'legs-8', name: 'Step-Up',               nameHe: 'עלייה על כיסא',     sets: 3, reps: 10, restSeconds: 40, instruction: 'Step onto a chair or box with control, drive through the heel.', instructionHe: 'עלו על כיסא או תיבה בשליטה, דחפו דרך העקב.' },
    ],
  },

  // ── BACK ────────────────────────────────────────────────────────────────────
  {
    id: 'back-strength',
    category: 'back',
    name: 'Back & Posterior Chain',
    nameHe: 'אימון גב ושרשרת אחורית',
    durationMinutes: 30,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['lats', 'upper-back', 'lower-back', 'hamstrings', 'glutes'],
    summary: 'Full back session — lats, upper back, lower back and postural muscles.',
    summaryHe: 'אימון גב מלא — גב רחב, גב עליון, גב תחתון ושרירי יציבה.',
    exercises: [
      { id: 'back-1', name: 'Superman',              nameHe: 'סופרמן',           sets: 3, reps: 12, restSeconds: 30, instruction: 'Lie face down, lift arms and legs simultaneously and hold briefly.', instructionHe: 'שכבו על הבטן, הרימו ידיים ורגליים בו-זמנית ועצרו לרגע.' },
      { id: 'back-2', name: 'Good Morning',          nameHe: 'בוקר טוב',         sets: 3, reps: 12, restSeconds: 45, instruction: 'Hinge forward at the hips with a neutral spine, then return upright.', instructionHe: 'הטו קדימה מהאגן עם עמוד שדרה ניטרלי, ואחר כך חזרו זקוף.' },
      { id: 'back-3', name: 'Bent-Over Row',         nameHe: 'חתירה מכופף',      sets: 4, reps: 10, restSeconds: 60, instruction: 'Hinge at hips, row both dumbbells to lower ribs, keep back flat.', instructionHe: 'כופפו מהאגן, חתרו שתי משקולות לצלעות תחתונות, גב ישר.' },
      { id: 'back-4', name: 'Single Leg Deadlift',   nameHe: 'דדליפט רגל אחת',  sets: 3, reps: 10, restSeconds: 50, instruction: 'Balance on one leg, hinge forward and lower the weight toward the floor.', instructionHe: 'עמדו על רגל אחת, הטו קדימה והורידו את המשקל לכיוון הרצפה.' },
      { id: 'back-5', name: 'Renegade Row',          nameHe: 'חתירה פלאנק',      sets: 3, reps: 8,  restSeconds: 60, instruction: 'In plank on dumbbells, row one arm up while stabilising with the other.', instructionHe: 'בפלאנק עם משקולות, חתרו יד אחת למעלה בזמן שהשנייה מייצבת.' },
      { id: 'back-6', name: 'Back Extension Hold',   nameHe: 'החזקת פשיטת גב',  sets: 3, reps: 30, durationSeconds: 30, restSeconds: 35, instruction: 'From lying face down, raise chest off the floor and hold.', instructionHe: 'משכיבה על הבטן, הרימו חזה מהרצפה והחזיקו.' },
      { id: 'back-7', name: 'Inchworm',              nameHe: 'תולעת',            sets: 3, reps: 8,  restSeconds: 40, instruction: 'Walk hands out to plank, hold a moment, then walk feet to hands.', instructionHe: 'הלכו עם הידיים לפלאנק, עצרו רגע, ואחר כך הלכו עם הרגליים לידיים.' },
    ],
  },

  // ── CHEST ───────────────────────────────────────────────────────────────────
  {
    id: 'chest-strength',
    category: 'chest',
    name: 'Chest & Push',
    nameHe: 'אימון חזה ודחיפה',
    durationMinutes: 28,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['chest', 'triceps', 'front-delts'],
    summary: 'Push-focused session targeting chest from multiple angles.',
    summaryHe: 'אימון דחיפה עם דגש על חזה מכמה זוויות.',
    exercises: [
      { id: 'chest-1', name: 'Push-Ups',                      nameHe: 'שכיבות סמיכה',               sets: 4, reps: 12, restSeconds: 45, instruction: 'Keep body straight, lower chest to the floor and press back up.', instructionHe: 'שמרו גוף ישר, רדו עם החזה לרצפה ולחצו חזרה.' },
      { id: 'chest-2', name: 'Wide Push-Up',                  nameHe: 'שכיבת סמיכה רחבה',           sets: 3, reps: 12, restSeconds: 45, instruction: 'Place hands wider than shoulder-width to emphasize the outer chest.', instructionHe: 'מקמו ידיים רחב מרוחב כתפיים כדי לדגש חזה חיצוני.' },
      { id: 'chest-3', name: 'Diamond Push-Up',               nameHe: 'שכיבת סמיכה יהלום',          sets: 3, reps: 8,  restSeconds: 45, instruction: 'Form a diamond with your hands and keep elbows close throughout.', instructionHe: 'צרו יהלום עם הידיים ושמרו מרפקים קרובים לגוף לאורך כל התנועה.' },
      { id: 'chest-4', name: 'Decline Push-Up',               nameHe: 'שכיבת סמיכה שיפוע',          sets: 3, reps: 10, restSeconds: 45, instruction: 'Feet elevated, press down to target the upper chest.', instructionHe: 'רגליים מורמות, לחצו למטה לדגש החזה העליון.' },
      { id: 'chest-5', name: 'Dumbbell Chest Fly',            nameHe: 'פרפר משקולות',               sets: 3, reps: 12, restSeconds: 50, instruction: 'Lie on a bench or floor, open arms wide and squeeze chest to close them.', instructionHe: 'שכבו על ספסל או רצפה, פתחו ידיים רחב וסחטו חזה לסגירתן.' },
      { id: 'chest-6', name: 'Archer Push-Up',                nameHe: 'שכיבת סמיכה קשת',            sets: 3, reps: 6,  restSeconds: 60, instruction: 'Shift weight to one side with arm extended, alternate sides.', instructionHe: 'העבירו משקל לצד אחד כשהיד האחרת פשוטה, החליפו צדדים.' },
    ],
  },

  // ── GYM (static workouts — builder generates custom ones) ───────────────────
  {
    id: 'gym-upper',
    category: 'gym',
    name: 'Gym Upper Body',
    nameHe: 'אימון פלג עליון חדר כושר',
    durationMinutes: 45,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['chest', 'back', 'biceps', 'triceps', 'shoulders'],
    summary: 'Machine & free-weight upper body session — chest, back and arms.',
    summaryHe: 'אימון מכונות ומשקולות לפלג עליון — חזה, גב וידיים.',
    exercises: [
      { id: 'gym-u1', name: 'Chest Press Machine',    nameHe: 'מכונת לחיצת חזה',         sets: 4, reps: 10, restSeconds: 60, instruction: 'Adjust seat so handles are at mid-chest. Press forward and return with control.', instructionHe: 'כוונו מושב כך שידיות בגובה החזה. לחצו קדימה וחזרו בשליטה.' },
      { id: 'gym-u2', name: 'Lat Pulldown',           nameHe: 'פולי עליון',              sets: 4, reps: 10, restSeconds: 60, instruction: 'Pull the bar to your upper chest, lean back slightly and squeeze lats.', instructionHe: 'משכו את הבר לגובה החזה העליון, הטו מעט לאחור וסחטו גב.' },
      { id: 'gym-u3', name: 'Seated Cable Row',       nameHe: 'חתירה בכבל',              sets: 3, reps: 12, restSeconds: 60, instruction: 'Keep your back straight and pull handle toward your navel.', instructionHe: 'שמרו גב ישר ומשכו ידית לכיוון הבטן.' },
      { id: 'gym-u4', name: 'Dumbbell Biceps Curl',   nameHe: 'כפיפת מרפקים עם משקולות', sets: 3, reps: 12, restSeconds: 45, instruction: 'Curl with control, elbows stay at your sides.', instructionHe: 'כופפו בשליטה, מרפקים נשארים לצד הגוף.' },
      { id: 'gym-u5', name: 'Cable Triceps Pushdown', nameHe: 'פשיטת מרפקים בכבל',       sets: 3, reps: 12, restSeconds: 45, instruction: 'Keep elbows fixed and push the rope down until arms are straight.', instructionHe: 'מרפקים קבועים, דחפו חבל למטה עד יישור הזרועות.' },
    ],
  },
  {
    id: 'gym-lower',
    category: 'gym',
    name: 'Gym Leg Day',
    nameHe: 'אימון רגליים חדר כושר',
    durationMinutes: 50,
    difficulty: 'hard',
    type: 'strength',
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    summary: 'Machine-based lower body blast — leg press, curls and extensions.',
    summaryHe: 'אימון רגליים במכונות — לחיצת רגליים, כפיפות ופשיטות.',
    exercises: [
      { id: 'gym-l1', name: 'Leg Press',         nameHe: 'לחיצת רגליים',       sets: 4, reps: 10, restSeconds: 75, instruction: 'Place feet shoulder-width, press the platform away without locking your knees.', instructionHe: 'מקמו רגליים ברוחב כתפיים, דחפו פלטפורמה בלי לנעול ברכיים.' },
      { id: 'gym-l2', name: 'Leg Curl',          nameHe: 'כפיפת ברך במכונה',   sets: 3, reps: 12, restSeconds: 60, instruction: 'Curl heels toward glutes and lower slowly.', instructionHe: 'קרבו עקבים לישבן ורדו לאט.' },
      { id: 'gym-l3', name: 'Leg Extension',     nameHe: 'פשיטת ברך במכונה',   sets: 3, reps: 12, restSeconds: 60, instruction: 'Extend to full lockout and squeeze quads at the top.', instructionHe: 'פשטו עד יישור מלא וסחטו ירכיים בחלק העליון.' },
      { id: 'gym-l4', name: 'Seated Calf Raise', nameHe: 'עליות תאומים ישיבה', sets: 4, reps: 15, restSeconds: 45, instruction: 'Full range of motion — all the way up and all the way down.', instructionHe: 'טווח מלא — למעלה עד הסוף ולמטה עד הסוף.' },
    ],
  },
  {
    id: 'gym-fullbody',
    category: 'gym',
    name: 'Gym Full Body',
    nameHe: 'אימון כל הגוף חדר כושר',
    durationMinutes: 60,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['chest', 'back', 'legs', 'shoulders', 'core'],
    summary: 'Full-body gym circuit hitting all major muscle groups with machines.',
    summaryHe: 'אימון מלא בחדר כושר עם מכונות לכל קבוצות השרירים.',
    exercises: [
      { id: 'gym-f1', name: 'Leg Press',              nameHe: 'לחיצת רגליים',         sets: 3, reps: 10, restSeconds: 60, instruction: 'Place feet shoulder-width, press the platform away without locking your knees.', instructionHe: 'מקמו רגליים ברוחב כתפיים, דחפו פלטפורמה בלי לנעול ברכיים.' },
      { id: 'gym-f2', name: 'Chest Press Machine',    nameHe: 'מכונת לחיצת חזה',      sets: 3, reps: 10, restSeconds: 60, instruction: 'Adjust seat so handles are at mid-chest. Press forward and return with control.', instructionHe: 'כוונו מושב כך שידיות בגובה החזה. לחצו קדימה וחזרו בשליטה.' },
      { id: 'gym-f3', name: 'Lat Pulldown',           nameHe: 'פולי עליון',            sets: 3, reps: 10, restSeconds: 60, instruction: 'Pull the bar to your upper chest, lean back slightly and squeeze lats.', instructionHe: 'משכו את הבר לגובה החזה העליון, הטו מעט לאחור וסחטו גב.' },
      { id: 'gym-f4', name: 'Shoulder Press Machine', nameHe: 'מכונת לחיצת כתפיים',   sets: 3, reps: 10, restSeconds: 60, instruction: 'Press overhead and lower until elbows are at shoulder height.', instructionHe: 'לחצו מעל הראש ורדו עד שמרפקים בגובה הכתפיים.' },
      { id: 'gym-f5', name: 'Cable Crunch',           nameHe: 'כפיפות בטן בכבל',      sets: 3, reps: 15, restSeconds: 45, instruction: 'Kneel and crunch your elbows toward your knees, rounding your back.', instructionHe: 'כרעו וקרבו מרפקים לברכיים תוך עיגול הגב.' },
    ],
  },
]

export const mockAerobicWorkouts: AerobicWorkout[] = [
  { id: 'aero-run',    type: 'run',    name: 'Outdoor Run',   nameHe: 'ריצה בחוץ',   durationMinutes: 20, difficulty: 'medium', baseDistanceKm: 3.1, baseCalories: 260, avgPace: '6:25 / km',  avgHeartRate: 148, summary: 'Mock running tracker with distance, pace, calories, and heart-rate stats.', summaryHe: 'מד ריצה מדומה עם מרחק, קצב, קלוריות ודופק.' },
  { id: 'aero-walk',   type: 'walk',   name: 'Power Walk',    nameHe: 'הליכת כוח',   durationMinutes: 25, difficulty: 'easy',   baseDistanceKm: 2.2, baseCalories: 150, avgPace: '11:20 / km', avgHeartRate: 112, summary: 'Lower-intensity aerobic session for recovery and consistency.', summaryHe: 'אירובי בעצימות נמוכה להתאוששות ושמירה על רצף.' },
  { id: 'aero-bike',   type: 'bike',   name: 'Bike Ride',     nameHe: 'רכיבה',       durationMinutes: 30, difficulty: 'medium', baseDistanceKm: 8.4, baseCalories: 280, avgPace: '3:35 / km',  avgHeartRate: 136, summary: 'Steady cycling tracker with distance and effort stats.', summaryHe: 'מד רכיבה מדומה עם מרחק, מאמץ וקלוריות.' },
  { id: 'aero-stairs', type: 'stairs', name: 'Stair Climb',   nameHe: 'מדרגות',      durationMinutes: 15, difficulty: 'hard',   baseDistanceKm: 1.1, baseCalories: 210, avgPace: '13 floors',  avgHeartRate: 156, summary: 'Short high-effort aerobic climb with floors and heart-rate stats.', summaryHe: 'אימון מדרגות קצר ועצים עם קומות ודופק.' },
]

export const todayWorkout = mockWorkouts[0]
