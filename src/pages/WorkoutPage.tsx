import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import { ExerciseAnimation } from '../components/ExerciseAnimation'
import { getAgeGuidance, getProfileGoals, getProfileWeeklyPlan, getProfileWorkoutTypes, WEEK_DAYS, type Goal, type ScheduleFocus, type UserProfile, useUser, type WorkoutType } from '../context/UserContext'
import {
  mockAerobicWorkouts,
  mockWorkouts,
  type AerobicWorkout,
  type Exercise,
  type ExerciseCoachingDetails,
  type Workout,
  type WorkoutCategory,
} from '../data/mockWorkouts'
import { getHeartRateSummary } from '../deviceConnections'
import { estimateCardioCalories, getCardioActivityType } from '../fitnessTracking'
import { startLocationTracker, type LocationTrackerStatus } from '../locationTracker'
import { getWorkoutProgress, saveCardioSession, saveCompletedWorkout, type WorkoutProgressEntry } from '../progressStorage'
import { getCurrentHR, getHRZone, HR_ZONE_COLOR, HR_ZONE_LABEL, onHeartRate } from '../lib/heartRate'

type Phase = 'select' | 'countdown' | 'active' | 'rest' | 'aerobic' | 'done'
type WorkoutChoice = WorkoutCategory | 'aerobic'
type AgeGuidance = ReturnType<typeof getAgeGuidance>
type GymFocus = 'full' | 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs'
type GymGoal = 'strength' | 'muscle' | 'endurance'
type WorkoutDuration = 10 | 15 | 20 | 30 | 45 | 60 | 75 | 90
type GymDuration = 15 | 20 | 30 | 45 | 60 | 75 | 90
type HomeWorkoutCategory = Exclude<WorkoutCategory, 'gym'>
type GymProgressMode = 'gentle' | 'steady' | 'boost'
type CardioSummary = {
  calories: number
  distanceKm: number
  durationMinutes: number
  type: string
}
type GymProgressSummary = {
  easyCount: number
  hardCount: number
  mode: GymProgressMode
  target: number
  workoutsThisWeek: number
}
type GymExerciseTemplate = {
  equipment: string
  equipmentHe: string
  focus: GymFocus
  id: string
  instruction: string
  instructionHe: string
  name: string
  nameHe: string
}

const categoryLabelKeys: Record<WorkoutChoice, string> = {
  goal: 'goalWorkout',
  abs: 'absWorkout',
  arms: 'armsWorkout',
  legs: 'legsWorkout',
  gym: 'gymWorkout',
  aerobic: 'aerobicWorkout',
}

const GYM_DURATIONS: GymDuration[] = [15, 20, 30, 45, 60, 75, 90]

const GYM_FOCUS_OPTIONS: { key: GymFocus; label: string; labelHe: string }[] = [
  { key: 'full', label: 'Full body', labelHe: 'כל הגוף' },
  { key: 'chest', label: 'Chest', labelHe: 'חזה' },
  { key: 'back', label: 'Back', labelHe: 'גב' },
  { key: 'legs', label: 'Legs', labelHe: 'רגליים' },
  { key: 'shoulders', label: 'Shoulders', labelHe: 'כתפיים' },
  { key: 'arms', label: 'Arms', labelHe: 'ידיים' },
  { key: 'abs', label: 'Abs', labelHe: 'בטן' },
]

const GYM_GOAL_OPTIONS: { key: GymGoal; label: string; labelHe: string }[] = [
  { key: 'strength', label: 'Strength', labelHe: 'כוח' },
  { key: 'muscle', label: 'Muscle growth', labelHe: 'בניית שריר' },
  { key: 'endurance', label: 'Muscular endurance', labelHe: 'סיבולת שריר' },
]

const GYM_EXERCISES: GymExerciseTemplate[] = [
  { id: 'leg-press', focus: 'full', name: 'Leg Press', nameHe: 'לחיצת רגליים במכונה', equipment: 'Leg press machine', equipmentHe: 'מכונת לחיצת רגליים', instruction: 'Set the seat so your knees bend comfortably, press through the full foot, and avoid locking the knees.', instructionHe: 'כוון את המושב כך שהברכיים יתכופפו בנוחות, דחוף דרך כל כף הרגל ואל תנעל ברכיים.' },
  { id: 'lat-pulldown', focus: 'full', name: 'Lat Pulldown', nameHe: 'פולי עליון לגב', equipment: 'Lat pulldown cable machine', equipmentHe: 'מכונת פולי עליון', instruction: 'Pull the bar toward the upper chest with shoulders down and controlled return.', instructionHe: 'משוך את המוט לכיוון החזה העליון כשהכתפיים נמוכות וחזור בשליטה.' },
  { id: 'chest-press', focus: 'full', name: 'Chest Press Machine', nameHe: 'מכונת לחיצת חזה', equipment: 'Chest press machine', equipmentHe: 'מכונת לחיצת חזה', instruction: 'Keep shoulder blades back, press forward smoothly, and stop before the elbows lock.', instructionHe: 'שמור שכמות לאחור, לחץ קדימה בצורה חלקה ועצור לפני נעילת מרפקים.' },
  { id: 'cable-row', focus: 'full', name: 'Seated Cable Row', nameHe: 'חתירה בישיבה בכבל', equipment: 'Seated cable row', equipmentHe: 'כבל חתירה בישיבה', instruction: 'Sit tall, pull elbows toward the ribs, and keep the torso stable.', instructionHe: 'שב זקוף, משוך מרפקים לכיוון הצלעות ושמור גוף יציב.' },
  { id: 'machine-shoulder-press', focus: 'full', name: 'Shoulder Press Machine', nameHe: 'מכונת לחיצת כתפיים', equipment: 'Shoulder press machine', equipmentHe: 'מכונת לחיצת כתפיים', instruction: 'Start with handles around shoulder height and press without arching the lower back.', instructionHe: 'התחל כשהידיות בגובה הכתפיים ולחץ בלי להקשית את הגב התחתון.' },

  { id: 'incline-db-press', focus: 'chest', name: 'Incline Dumbbell Press', nameHe: 'לחיצת חזה בשיפוע עם משקולות', equipment: 'Incline bench and dumbbells', equipmentHe: 'ספסל שיפוע ומשקולות', instruction: 'Use a moderate incline, lower the dumbbells with control, and press on a steady path.', instructionHe: 'השתמש בשיפוע מתון, הורד את המשקולות בשליטה ולחץ במסלול יציב.' },
  { id: 'cable-fly', focus: 'chest', name: 'Cable Fly', nameHe: 'פרפר בכבלים', equipment: 'Cable crossover', equipmentHe: 'קרוס כבלים', instruction: 'Keep a soft elbow bend and bring the hands together without shrugging.', instructionHe: 'שמור כיפוף קל במרפקים וקרב ידיים בלי להרים כתפיים.' },
  { id: 'pec-deck', focus: 'chest', name: 'Pec Deck', nameHe: 'פרפר חזה במכונה', equipment: 'Pec deck machine', equipmentHe: 'מכונת פרפר חזה', instruction: 'Adjust the handles to chest height and squeeze the chest at the center.', instructionHe: 'כוון ידיות לגובה החזה וכווץ את החזה במרכז התנועה.' },

  { id: 'single-arm-row', focus: 'back', name: 'Single Arm Cable Row', nameHe: 'חתירה יד אחת בכבל', equipment: 'Cable station', equipmentHe: 'עמדת כבלים', instruction: 'Pull one elbow back at a time and keep the ribs stacked over the hips.', instructionHe: 'משוך מרפק אחד לאחור בכל פעם ושמור צלעות מעל האגן.' },
  { id: 'chest-supported-row', focus: 'back', name: 'Chest Supported Row', nameHe: 'חתירה עם תמיכת חזה', equipment: 'Row machine or incline bench', equipmentHe: 'מכונת חתירה או ספסל שיפוע', instruction: 'Rest the chest on the pad and pull with the upper back, not momentum.', instructionHe: 'הישען עם החזה על הריפוד ומשוך עם הגב העליון, לא עם תנופה.' },
  { id: 'back-extension', focus: 'back', name: 'Back Extension', nameHe: 'פשיטת גב', equipment: 'Back extension bench', equipmentHe: 'ספסל פשיטת גב', instruction: 'Move slowly through a comfortable range and keep the neck neutral.', instructionHe: 'עבוד לאט בטווח נוח ושמור צוואר ניטרלי.' },

  { id: 'leg-curl', focus: 'legs', name: 'Seated Leg Curl', nameHe: 'כפיפת ברך בישיבה', equipment: 'Seated leg curl machine', equipmentHe: 'מכונת כפיפת ברך', instruction: 'Line up the knee with the machine pivot and curl without lifting the hips.', instructionHe: 'יישר את הברך עם ציר המכונה וכפוף בלי להרים אגן.' },
  { id: 'leg-extension', focus: 'legs', name: 'Leg Extension', nameHe: 'פשיטת ברך במכונה', equipment: 'Leg extension machine', equipmentHe: 'מכונת פשיטת ברך', instruction: 'Lift under control, pause briefly, and lower without swinging.', instructionHe: 'הרם בשליטה, עצור קצר, והורד בלי תנופה.' },
  { id: 'smith-squat', focus: 'legs', name: 'Smith Machine Squat', nameHe: 'סקוואט בסמית', equipment: 'Smith machine', equipmentHe: 'מכונת סמית', instruction: 'Place feet where the movement feels stable and keep the knees tracking over the toes.', instructionHe: 'מקם רגליים במקום יציב ושמור ברכיים בכיוון האצבעות.' },
  { id: 'calf-raise', focus: 'legs', name: 'Standing Calf Raise', nameHe: 'עליות תאומים במכונה', equipment: 'Calf raise machine', equipmentHe: 'מכונת תאומים', instruction: 'Rise high onto the toes, pause, then lower slowly.', instructionHe: 'עלה גבוה על קצות האצבעות, עצור, ואז רד לאט.' },

  { id: 'cable-lateral-raise', focus: 'shoulders', name: 'Cable Lateral Raise', nameHe: 'הרחקת כתף בכבל', equipment: 'Low cable pulley', equipmentHe: 'פולי תחתון', instruction: 'Raise to shoulder height with a soft elbow and slow return.', instructionHe: 'הרם עד גובה כתף עם מרפק רך וחזור לאט.' },
  { id: 'face-pull', focus: 'shoulders', name: 'Face Pull', nameHe: 'משיכת פנים בכבל', equipment: 'Cable rope', equipmentHe: 'חבל בכבל', instruction: 'Pull the rope toward eye level and rotate the hands slightly outward.', instructionHe: 'משוך את החבל לגובה העיניים וסובב ידיים מעט החוצה.' },
  { id: 'rear-delt-machine', focus: 'shoulders', name: 'Rear Delt Machine', nameHe: 'מכונת כתף אחורית', equipment: 'Rear delt machine', equipmentHe: 'מכונת כתף אחורית', instruction: 'Keep the chest supported and open the arms with control.', instructionHe: 'שמור חזה נתמך ופתח ידיים בשליטה.' },

  { id: 'triceps-pushdown', focus: 'arms', name: 'Cable Triceps Pushdown', nameHe: 'פשיטת מרפקים בכבל', equipment: 'Cable rope or bar', equipmentHe: 'חבל או מוט בכבל', instruction: 'Keep elbows close to the ribs and press down without leaning.', instructionHe: 'שמור מרפקים קרובים לצלעות ולחץ מטה בלי להישען.' },
  { id: 'preacher-curl', focus: 'arms', name: 'Preacher Curl Machine', nameHe: 'כפיפת מרפקים במכונת פריצ׳ר', equipment: 'Preacher curl machine', equipmentHe: 'מכונת פריצ׳ר', instruction: 'Keep the upper arms on the pad and curl through a smooth range.', instructionHe: 'שמור זרועות על הכרית וכפוף בטווח חלק.' },
  { id: 'hammer-curl', focus: 'arms', name: 'Dumbbell Hammer Curl', nameHe: 'כפיפת פטיש עם משקולות', equipment: 'Dumbbells', equipmentHe: 'משקולות יד', instruction: 'Curl with palms facing each other and avoid swinging the torso.', instructionHe: 'כפוף כשהכפות פונות זו לזו והימנע מתנופת גוף.' },

  { id: 'cable-crunch', focus: 'abs', name: 'Cable Crunch', nameHe: 'כפיפות בטן בכבל', equipment: 'Cable rope', equipmentHe: 'חבל בכבל', instruction: 'Round the upper back gently toward the hips and avoid pulling with the arms.', instructionHe: 'עגל את הגב העליון בעדינות לכיוון האגן ואל תמשוך עם הידיים.' },
  { id: 'hanging-knee-raise', focus: 'abs', name: 'Hanging Knee Raise', nameHe: 'הרמת ברכיים בתלייה', equipment: 'Captain chair or pull-up station', equipmentHe: 'כיסא קפטן או מתקן מתח', instruction: 'Lift knees with control and stop if the lower back feels uncomfortable.', instructionHe: 'הרם ברכיים בשליטה ועצור אם הגב התחתון לא נוח.' },
  { id: 'torso-rotation', focus: 'abs', name: 'Torso Rotation Machine', nameHe: 'מכונת רוטציה לבטן', equipment: 'Torso rotation machine', equipmentHe: 'מכונת רוטציה', instruction: 'Use a light load and rotate through a controlled, pain-free range.', instructionHe: 'בחר משקל קל וסובב בטווח נשלט וללא כאב.' },
]

// Dumbbell alternatives for machine exercises — shown when user taps "No machine"
const DUMBBELL_ALTERNATIVES: Record<string, { name: string; nameHe: string; instruction: string; instructionHe: string }> = {
  'leg-press':             { name: 'Dumbbell Goblet Squat', nameHe: 'סקוואט גביע עם משקולת', instruction: 'Hold a dumbbell vertically at chest height, squat deep, and push through the heels.', instructionHe: 'החזק משקולת אנכית בגובה החזה, צנח עמוק ודחוף דרך העקבים.' },
  'lat-pulldown':          { name: 'Dumbbell Single-Arm Row', nameHe: 'חתירה יד אחת עם משקולת', instruction: 'Place one knee on a bench, row the dumbbell to the hip with a flat back.', instructionHe: 'הנח ברך אחת על ספסל, חתור את המשקולת לכיוון האגן עם גב ישר.' },
  'chest-press':           { name: 'Dumbbell Floor Press', nameHe: 'לחיצת חזה על הרצפה', instruction: 'Lie on the floor, press dumbbells from chest level, stop when elbows touch the floor.', instructionHe: 'שכב על הרצפה, לחץ משקולות מגובה החזה, עצור כשהמרפקים נוגעים ברצפה.' },
  'cable-row':             { name: 'Dumbbell Bent-Over Row', nameHe: 'חתירה מכופף עם משקולות', instruction: 'Hinge at the hips, keep the back flat, row both dumbbells to the lower ribs.', instructionHe: 'כופף מהאגן, שמור גב ישר, חתור שתי משקולות לכיוון הצלעות התחתונות.' },
  'machine-shoulder-press':{ name: 'Dumbbell Shoulder Press', nameHe: 'לחיצת כתפיים עם משקולות', instruction: 'Sit upright, press dumbbells from shoulder height overhead without arching the back.', instructionHe: 'שב זקוף, לחץ משקולות מגובה הכתפיים מעלה בלי להקשית הגב.' },
  'incline-db-press':      { name: 'Dumbbell Floor Press (Incline Angle)', nameHe: 'לחיצת חזה עליון בזווית', instruction: 'Place your upper back on a low surface at an angle and press the dumbbells.', instructionHe: 'הישען עם הגב העליון על משטח נמוך בזווית ולחץ את המשקולות.' },
  'cable-fly':             { name: 'Dumbbell Fly', nameHe: 'פרפר עם משקולות', instruction: 'Lie on the floor, open the arms wide with a soft elbow, and squeeze the chest at the top.', instructionHe: 'שכב על הרצפה, פרוש ידיים עם מרפקים רכים וכווץ חזה בסוף התנועה.' },
  'pec-deck':              { name: 'Dumbbell Fly', nameHe: 'פרפר עם משקולות', instruction: 'Lie on the floor, open the arms wide with a soft elbow, and squeeze the chest at the top.', instructionHe: 'שכב על הרצפה, פרוש ידיים עם מרפקים רכים וכווץ חזה בסוף התנועה.' },
  'single-arm-row':        { name: 'Dumbbell Single-Arm Row', nameHe: 'חתירה יד אחת עם משקולת', instruction: 'Place one knee on a bench, row the dumbbell to the hip with a flat back.', instructionHe: 'הנח ברך אחת על ספסל, חתור את המשקולת לכיוון האגן עם גב ישר.' },
  'chest-supported-row':   { name: 'Dumbbell Prone Row', nameHe: 'חתירה שכיבה עם משקולות', instruction: 'Lie face-down on a bench or ottoman and row both dumbbells up toward the hips.', instructionHe: 'שכב על הבטן על ספסל ומשוך שתי משקולות לכיוון האגן.' },
  'back-extension':        { name: 'Dumbbell Good Morning', nameHe: 'גוד מורנינג עם משקולת', instruction: 'Hold a light dumbbell at the chest, hinge at the hips, and squeeze the glutes to return.', instructionHe: 'החזק משקולת קלה בחזה, כופף מהאגן וכווץ ישבן לחזרה.' },
  'leg-curl':              { name: 'Dumbbell Romanian Deadlift', nameHe: 'רומניאן דדליפט עם משקולות', instruction: 'Hold dumbbells, hinge at the hips with soft knees, feel the hamstring stretch, then drive hips forward.', instructionHe: 'החזק משקולות, כופף מהאגן עם ברכיים רכות, הרגש מתיחה בהמסטרינג ודחוף אגן קדימה.' },
  'leg-extension':         { name: 'Dumbbell Split Squat', nameHe: 'סקוואט פיצול עם משקולות', instruction: 'Step one foot back, lower the rear knee toward the floor, keep the front shin vertical.', instructionHe: 'צעד רגל אחת לאחור, הורד ברך אחורית לכיוון הרצפה, שמור שוק קדמי אנכי.' },
  'smith-squat':           { name: 'Dumbbell Squat', nameHe: 'סקוואט עם משקולות', instruction: 'Hold dumbbells at the sides, squat until thighs are parallel, and drive through the heels.', instructionHe: 'החזק משקולות בצדדים, צנח עד שהירכיים מקבילות לרצפה ודחוף דרך העקבים.' },
  'calf-raise':            { name: 'Single-Leg Calf Raise', nameHe: 'עלייה על קצות אצבעות ברגל אחת', instruction: 'Stand on one foot on a step or flat floor, rise onto the toes slowly, and lower with control.', instructionHe: 'עמוד על רגל אחת על מדרגה או רצפה, עלה על קצות האצבעות לאט ורד בשליטה.' },
  'cable-lateral-raise':   { name: 'Dumbbell Lateral Raise', nameHe: 'הרחקת כתף עם משקולת', instruction: 'Raise dumbbells to shoulder height with soft elbows, pause, then lower slowly.', instructionHe: 'הרם משקולות לגובה הכתף עם מרפקים רכים, עצור ואז הורד לאט.' },
  'face-pull':             { name: 'Band Face Pull (or Dumbbell Rear Fly)', nameHe: 'משיכת פנים עם גומיה', instruction: 'If no band: lie face-down on a bench and raise the arms out to the sides like a reverse fly.', instructionHe: 'בלי גומיה: שכב על הבטן על ספסל והרם ידיים לצדדים כמו פרפר הפוך.' },
  'rear-delt-machine':     { name: 'Dumbbell Rear Delt Fly', nameHe: 'פרפר אחורי עם משקולות', instruction: 'Lie face-down on a bench, raise light dumbbells out to the sides, and squeeze the upper back.', instructionHe: 'שכב על הבטן על ספסל, הרם משקולות קלות לצדדים וכווץ גב עליון.' },
  'triceps-pushdown':      { name: 'Dumbbell Overhead Triceps Extension', nameHe: 'פשיטת מרפקים מעל הראש', instruction: 'Hold one dumbbell overhead with both hands, lower it behind the head, and extend back up.', instructionHe: 'החזק משקולת אחת מעל הראש עם שתי ידיים, הורד מאחורי הראש וחזור מעלה.' },
  'preacher-curl':         { name: 'Dumbbell Concentration Curl', nameHe: 'כפיפת ריכוז עם משקולת', instruction: 'Sit, brace the elbow against the inner thigh, and curl the dumbbell slowly.', instructionHe: 'שב, הישען עם המרפק על הירך הפנימית וכפוף את המשקולת לאט.' },
  'hammer-curl':           { name: 'Dumbbell Hammer Curl', nameHe: 'כפיפת פטיש עם משקולות', instruction: 'Curl with palms facing each other and avoid swinging the torso.', instructionHe: 'כפוף כשהכפות פונות זו לזו והימנע מתנופת גוף.' },
  'cable-crunch':          { name: 'Dumbbell Crunch', nameHe: 'כפיפת בטן עם משקולת', instruction: 'Lie on your back, hold a light dumbbell at the chest, and crunch the ribs toward the pelvis.', instructionHe: 'שכב על הגב, החזק משקולת קלה בחזה וכפוף צלעות לכיוון האגן.' },
  'hanging-knee-raise':    { name: 'Floor Lying Leg Raise', nameHe: 'הרמת רגליים שכיבה', instruction: 'Lie flat, keep legs straight, raise them to 90°, and lower slowly without arching the back.', instructionHe: 'שכב שטוח, שמור רגליים ישרות, הרם ל-90° ורד לאט בלי להקשית גב.' },
  'torso-rotation':        { name: 'Dumbbell Russian Twist', nameHe: 'רוטציה רוסית עם משקולת', instruction: 'Sit with feet off the floor, hold a light dumbbell, and rotate the torso side to side.', instructionHe: 'שב עם רגליים מורמות מהרצפה, החזק משקולת קלה וסובב גו לצדדים.' },
}


const goalLabelKeys: Record<Goal, string> = {
  cut: 'toneUp',
  bulk: 'buildMuscle',
  endurance: 'enduranceGoal',
  flexibility: 'flexibilityGoal',
  fitness: 'generalFitness',
  health: 'health',
  consistency: 'consistencyGoal',
}

const locationLabelKeys: Record<WorkoutType, string> = {
  gym: 'gym',
  home: 'home',
  outdoor: 'outdoor',
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function getWorkout(category: WorkoutCategory) {
  return mockWorkouts.find(workout => workout.category === category) ?? mockWorkouts[0]
}

function getStartOfWeek(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

function normalizeWorkoutDuration(duration?: number): WorkoutDuration {
  if (!duration) return 20
  if (duration <= 10) return 10
  if (duration <= 15) return 15
  if (duration <= 20) return 20
  if (duration <= 30) return 30
  if (duration <= 45) return 45
  if (duration <= 60) return 60
  if (duration <= 75) return 75
  return 90
}

function normalizeGymDuration(duration?: number): GymDuration {
  if (!duration) return 20
  if (duration <= 15) return 15
  if (duration <= 20) return 20
  if (duration <= 30) return 30
  if (duration <= 45) return 45
  if (duration <= 60) return 60
  if (duration <= 75) return 75
  return 90
}

function getConfiguredWorkoutDuration(profile: UserProfile, mode: 'home' | 'gym'): WorkoutDuration {
  const modeDuration = mode === 'gym' ? profile.gymWorkoutDuration : profile.homeWorkoutDuration
  return normalizeWorkoutDuration(modeDuration ?? profile.workoutDuration ?? profile.workout_time)
}

function getConfiguredGymDuration(profile: UserProfile): GymDuration {
  return normalizeGymDuration(profile.gymWorkoutDuration ?? profile.workoutDuration ?? profile.workout_time)
}

function getDefaultGymGoal(profile: UserProfile): GymGoal {
  const goals = getProfileGoals(profile)
  if (goals.includes('endurance')) return 'endurance'
  if (goals.includes('bulk')) return 'muscle'
  return 'strength'
}

function getDefaultGymFocuses(profile: UserProfile): GymFocus[] {
  const goals = getProfileGoals(profile)
  if (goals.includes('bulk')) return ['chest', 'back', 'legs']
  if (goals.includes('endurance')) return ['legs', 'back']
  if (goals.includes('flexibility')) return ['full']
  return ['full']
}

/**
 * Maps the user's primary goal to the WorkoutCategory that best fits it,
 * so the "Goal Workout" tab actually shows THEIR goal rather than a generic preset.
 * bulk  → arm/strength work
 * cut   → abs / core-conditioning
 * endurance → leg endurance
 * everything else → general 'goal' workout
 */
function deriveGoalWorkoutCategory(profile: UserProfile): WorkoutCategory {
  const goals = getProfileGoals(profile)
  if (goals.includes('bulk'))      return 'arms'  // compound + isolation for mass
  if (goals.includes('cut'))       return 'abs'   // core + conditioning for fat loss
  if (goals.includes('endurance')) return 'legs'  // leg endurance base
  return 'goal'                                   // health / fitness / flexibility / consistency
}

function resolveHomeWorkoutCategory(choice: HomeWorkoutCategory, profile: UserProfile): HomeWorkoutCategory {
  if (choice !== 'goal') return choice
  const category = deriveGoalWorkoutCategory(profile)
  return category === 'gym' ? 'goal' : category
}

function getHomeExerciseCount(duration: WorkoutDuration) {
  if (duration <= 15) return 3
  if (duration <= 20) return 4
  if (duration <= 30) return 5
  if (duration <= 45) return 7
  if (duration <= 60) return 9
  if (duration <= 75) return 10
  return 12
}

function getHomeSetTarget(level: UserProfile['fitnessLevel'], duration: WorkoutDuration) {
  const base = level === 'advanced' ? 4 : level === 'beginner' ? 2 : 3
  if (duration >= 60 && level !== 'beginner') return base + 1
  if (duration <= 15 && base > 2) return base - 1
  return base
}

function getHomeRestSeconds(level: UserProfile['fitnessLevel'], duration: WorkoutDuration) {
  if (level === 'beginner') return duration >= 45 ? 60 : 45
  if (level === 'advanced') return duration >= 45 ? 45 : 35
  return duration >= 45 ? 50 : 40
}

function getHomeDifficulty(level: UserProfile['fitnessLevel'], duration: WorkoutDuration): Workout['difficulty'] {
  if (level === 'advanced' || duration >= 60) return 'hard'
  if (level === 'beginner' && duration <= 30) return 'easy'
  return 'medium'
}

function selectHomeExercises(category: HomeWorkoutCategory, profile: UserProfile, count: number) {
  const resolvedCategory = resolveHomeWorkoutCategory(category, profile)
  const preferredWorkouts = [
    getWorkout(resolvedCategory),
    getWorkout('goal'),
    ...mockWorkouts.filter(workout => workout.category !== 'gym' && workout.category !== resolvedCategory && workout.category !== 'goal'),
  ]
  const unique = new Map<string, Exercise>()

  preferredWorkouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      if (!unique.has(exercise.id)) unique.set(exercise.id, exercise)
    })
  })

  return Array.from(unique.values()).slice(0, count)
}

function buildHomeWorkout(choice: HomeWorkoutCategory, profile: UserProfile): Workout {
  const duration = getConfiguredWorkoutDuration(profile, 'home')
  const category = resolveHomeWorkoutCategory(choice, profile)
  const baseWorkout = getWorkout(category)
  const exerciseCount = getHomeExerciseCount(duration)
  const sets = getHomeSetTarget(profile.fitnessLevel, duration)
  const restSeconds = getHomeRestSeconds(profile.fitnessLevel, duration)
  const exercises = selectHomeExercises(choice, profile, exerciseCount).map((exercise, index) => ({
    ...exercise,
    id: `${category}-${duration}-${exercise.id}-${index}`,
    restSeconds,
    sets,
  }))

  return {
    ...baseWorkout,
    id: `${baseWorkout.id}-${duration}-configured`,
    difficulty: getHomeDifficulty(profile.fitnessLevel, duration),
    durationMinutes: duration,
    exercises,
  }
}

// ── Time-budget exercise count ────────────────────────────────────────────────
// Given the selected duration (work time, including rest), work backwards to how
// many exercises actually fit. Formula per exercise:
//   sets × (repSeconds + restSeconds) + TRANSITION_SEC
// Warm-up and stretching are outside this gym work-time budget.
const TRANSITION_SEC = 30  // time to move between exercises / adjust machine
const WARMUP_SEC     = 0   // gym duration is work time only, not warm-up/stretch time

function calcGymExerciseCount(
  duration: GymDuration,
  sets: number,
  repSeconds: number,
  restSeconds: number,
): number {
  const budgetSec      = duration * 60 - WARMUP_SEC
  const perExerciseSec = sets * (repSeconds + restSeconds) + TRANSITION_SEC
  const count          = Math.floor(budgetSec / perExerciseSec)
  return Math.max(3, Math.min(15, count))
}

// Rough preview estimate (before prescription is known) — used only in UI chip
function getGymExerciseCount(duration: GymDuration) {
  if (duration <= 15) return 3
  if (duration <= 20) return 4
  if (duration <= 30) return 5
  if (duration <= 45) return 6
  if (duration <= 60) return 8
  if (duration <= 75) return 9
  return 10
}

function analyzeGymProgress(progress: WorkoutProgressEntry[], profile: UserProfile): GymProgressSummary {
  const start = getStartOfWeek().getTime()
  const workoutsThisWeek = progress.filter(entry => new Date(entry.date).getTime() >= start).length
  const target = Math.max(1, profile.workout_days ?? 3)
  const recent = progress.slice(0, 8)
  const hardCount = recent.filter(entry => {
    const feeling = entry.feeling?.toLowerCase() ?? ''
    return feeling.includes('hard') || feeling.includes('קשה')
  }).length
  const easyCount = recent.filter(entry => {
    const feeling = entry.feeling?.toLowerCase() ?? ''
    return feeling.includes('easy') || feeling.includes('קל')
  }).length

  if (workoutsThisWeek >= target && hardCount <= easyCount + 1) {
    return { easyCount, hardCount, mode: 'boost', target, workoutsThisWeek }
  }

  if (workoutsThisWeek === 0 || hardCount > easyCount + 1) {
    return { easyCount, hardCount, mode: 'gentle', target, workoutsThisWeek }
  }

  return { easyCount, hardCount, mode: 'steady', target, workoutsThisWeek }
}

function getGymProgressNote(progress: GymProgressSummary, language: 'en' | 'he') {
  if (language === 'he') {
    if (progress.mode === 'boost') {
      return `לפי ההתקדמות שלך: ${progress.workoutsThisWeek}/${progress.target} אימונים השבוע. נשמור על תרגילים מדויקים ונעלה מעט את האתגר.`
    }
    if (progress.mode === 'gentle') {
      return `לפי ההתקדמות שלך: ${progress.workoutsThisWeek}/${progress.target} אימונים השבוע. נבחר עומס רגוע יותר ומנוחות נוחות.`
    }
    return `לפי ההתקדמות שלך: ${progress.workoutsThisWeek}/${progress.target} אימונים השבוע. נבנה אימון מאוזן שמתאים להמשך עקבי.`
  }

  if (progress.mode === 'boost') {
    return `Based on your progress: ${progress.workoutsThisWeek}/${progress.target} workouts this week. The plan keeps the exercise count focused and raises the challenge slightly.`
  }
  if (progress.mode === 'gentle') {
    return `Based on your progress: ${progress.workoutsThisWeek}/${progress.target} workouts this week. The plan uses a calmer load and comfortable rests.`
  }
  return `Based on your progress: ${progress.workoutsThisWeek}/${progress.target} workouts this week. The plan stays balanced for steady consistency.`
}

function getGymPrescription(goal: GymGoal, level: UserProfile['fitnessLevel'], mode: GymProgressMode, _duration: GymDuration) {
  // Sets are constant regardless of duration — more time = more EXERCISES, not more sets.
  const baseSets = goal === 'strength' ? 4 : 3
  const levelAdjustment = level === 'advanced' ? 1 : level === 'beginner' ? -1 : 0
  const progressAdjustment = mode === 'boost' ? 1 : mode === 'gentle' ? -1 : 0
  const sets = Math.min(5, Math.max(2, baseSets + levelAdjustment + progressAdjustment))

  if (goal === 'strength') {
    return {
      reps: mode === 'gentle' ? 6 : 8,
      restSeconds: mode === 'boost' ? 75 : mode === 'gentle' ? 105 : 90,
      sets,
    }
  }

  if (goal === 'endurance') {
    return {
      reps: mode === 'gentle' ? 10 : 14,
      restSeconds: mode === 'boost' ? 45 : mode === 'gentle' ? 75 : 60,
      sets,
    }
  }

  return {
    reps: mode === 'gentle' ? 8 : 12,
    restSeconds: mode === 'boost' ? 60 : mode === 'gentle' ? 90 : 75,
    sets,
  }
}

function selectGymExerciseTemplates(focuses: GymFocus[], count: number) {
  const normalizedFocuses: GymFocus[] = focuses.length > 0 ? focuses : ['full']
  const buckets = normalizedFocuses.map(focus => {
    const exercises = GYM_EXERCISES.filter(exercise => exercise.focus === focus)
    return exercises.length > 0 ? exercises : GYM_EXERCISES.filter(exercise => exercise.focus === 'full')
  })
  const selected: GymExerciseTemplate[] = []
  let cursor = 0

  while (selected.length < count && cursor < count * buckets.length * 2) {
    const bucket = buckets[cursor % buckets.length]
    const exercise = bucket[Math.floor(cursor / buckets.length) % bucket.length]
    if (!selected.some(item => item.id === exercise.id)) {
      selected.push(exercise)
    }
    cursor += 1
  }

  if (selected.length < count) {
    for (const exercise of GYM_EXERCISES) {
      if (selected.length >= count) break
      if (!selected.some(item => item.id === exercise.id)) selected.push(exercise)
    }
  }

  return selected.slice(0, count)
}

function getGymFocusNames(focuses: GymFocus[], language: 'en' | 'he') {
  return focuses
    .map(focus => GYM_FOCUS_OPTIONS.find(option => option.key === focus))
    .filter((option): option is { key: GymFocus; label: string; labelHe: string } => Boolean(option))
    .map(option => language === 'he' ? option.labelHe : option.label)
    .join(language === 'he' ? ', ' : ', ')
}

function getGymGoalName(goal: GymGoal, language: 'en' | 'he') {
  const option = GYM_GOAL_OPTIONS.find(item => item.key === goal) ?? GYM_GOAL_OPTIONS[0]
  return language === 'he' ? option.labelHe : option.label
}

function getGymDifficulty(level: UserProfile['fitnessLevel'], mode: GymProgressMode): Workout['difficulty'] {
  if (mode === 'boost' || level === 'advanced') return 'hard'
  if (mode === 'gentle' || level === 'beginner') return 'easy'
  return 'medium'
}

function getExerciseMuscles(template: GymExerciseTemplate) {
  const muscles: Record<string, Pick<ExerciseCoachingDetails, 'primaryMuscle' | 'primaryMuscleHe' | 'secondaryMuscles' | 'secondaryMusclesHe'>> = {
    'back-extension': { primaryMuscle: 'Lower back and glutes', primaryMuscleHe: 'גב תחתון וישבן', secondaryMuscles: ['Hamstrings', 'deep core stabilizers'], secondaryMusclesHe: ['המסטרינג', 'מייצבי ליבה עמוקים'] },
    'cable-crunch': { primaryMuscle: 'Rectus abdominis', primaryMuscleHe: 'שריר הבטן הישר', secondaryMuscles: ['Deep core', 'hip stabilizers'], secondaryMusclesHe: ['ליבה עמוקה', 'מייצבי אגן'] },
    'cable-fly': { primaryMuscle: 'Chest', primaryMuscleHe: 'חזה', secondaryMuscles: ['Front shoulders', 'serratus'], secondaryMusclesHe: ['כתף קדמית', 'שריר המסור'] },
    'cable-lateral-raise': { primaryMuscle: 'Side delts', primaryMuscleHe: 'כתף אמצעית', secondaryMuscles: ['Upper traps', 'rotator cuff'], secondaryMusclesHe: ['טרפז עליון', 'מסובבי כתף'] },
    'cable-row': { primaryMuscle: 'Lats and mid-back', primaryMuscleHe: 'רחב גבי ומרכז גב', secondaryMuscles: ['Rear shoulders', 'biceps'], secondaryMusclesHe: ['כתף אחורית', 'יד קדמית'] },
    'calf-raise': { primaryMuscle: 'Calves', primaryMuscleHe: 'תאומים', secondaryMuscles: ['Soleus', 'ankle stabilizers'], secondaryMusclesHe: ['סולאוס', 'מייצבי קרסול'] },
    'chest-press': { primaryMuscle: 'Chest', primaryMuscleHe: 'חזה', secondaryMuscles: ['Triceps', 'front shoulders'], secondaryMusclesHe: ['יד אחורית', 'כתף קדמית'] },
    'chest-supported-row': { primaryMuscle: 'Mid-back', primaryMuscleHe: 'מרכז הגב', secondaryMuscles: ['Lats', 'rear shoulders', 'biceps'], secondaryMusclesHe: ['רחב גבי', 'כתף אחורית', 'יד קדמית'] },
    'face-pull': { primaryMuscle: 'Rear shoulders', primaryMuscleHe: 'כתף אחורית', secondaryMuscles: ['Upper back', 'rotator cuff'], secondaryMusclesHe: ['גב עליון', 'מסובבי כתף'] },
    'hammer-curl': { primaryMuscle: 'Brachialis and biceps', primaryMuscleHe: 'ברכיאליס ויד קדמית', secondaryMuscles: ['Forearms'], secondaryMusclesHe: ['אמות'] },
    'hanging-knee-raise': { primaryMuscle: 'Lower abs', primaryMuscleHe: 'בטן תחתונה', secondaryMuscles: ['Hip flexors', 'grip'], secondaryMusclesHe: ['כופפי ירך', 'אחיזה'] },
    'incline-db-press': { primaryMuscle: 'Upper chest', primaryMuscleHe: 'חזה עליון', secondaryMuscles: ['Triceps', 'front shoulders'], secondaryMusclesHe: ['יד אחורית', 'כתף קדמית'] },
    'lat-pulldown': { primaryMuscle: 'Lats', primaryMuscleHe: 'רחב גבי', secondaryMuscles: ['Biceps', 'mid-back'], secondaryMusclesHe: ['יד קדמית', 'מרכז גב'] },
    'leg-curl': { primaryMuscle: 'Hamstrings', primaryMuscleHe: 'המסטרינג', secondaryMuscles: ['Calves', 'glutes'], secondaryMusclesHe: ['תאומים', 'ישבן'] },
    'leg-extension': { primaryMuscle: 'Quadriceps', primaryMuscleHe: 'ארבע ראשי', secondaryMuscles: ['Knee stabilizers'], secondaryMusclesHe: ['מייצבי ברך'] },
    'leg-press': { primaryMuscle: 'Quadriceps and glutes', primaryMuscleHe: 'ארבע ראשי וישבן', secondaryMuscles: ['Hamstrings', 'calves'], secondaryMusclesHe: ['המסטרינג', 'תאומים'] },
    'machine-shoulder-press': { primaryMuscle: 'Shoulders', primaryMuscleHe: 'כתפיים', secondaryMuscles: ['Triceps', 'upper chest'], secondaryMusclesHe: ['יד אחורית', 'חזה עליון'] },
    'pec-deck': { primaryMuscle: 'Chest', primaryMuscleHe: 'חזה', secondaryMuscles: ['Front shoulders'], secondaryMusclesHe: ['כתף קדמית'] },
    'preacher-curl': { primaryMuscle: 'Biceps', primaryMuscleHe: 'יד קדמית', secondaryMuscles: ['Brachialis', 'forearms'], secondaryMusclesHe: ['ברכיאליס', 'אמות'] },
    'rear-delt-machine': { primaryMuscle: 'Rear shoulders', primaryMuscleHe: 'כתף אחורית', secondaryMuscles: ['Upper back', 'rotator cuff'], secondaryMusclesHe: ['גב עליון', 'מסובבי כתף'] },
    'single-arm-row': { primaryMuscle: 'Lats', primaryMuscleHe: 'רחב גבי', secondaryMuscles: ['Mid-back', 'biceps', 'core'], secondaryMusclesHe: ['מרכז גב', 'יד קדמית', 'ליבה'] },
    'smith-squat': { primaryMuscle: 'Quadriceps and glutes', primaryMuscleHe: 'ארבע ראשי וישבן', secondaryMuscles: ['Hamstrings', 'core'], secondaryMusclesHe: ['המסטרינג', 'ליבה'] },
    'torso-rotation': { primaryMuscle: 'Obliques', primaryMuscleHe: 'אלכסונים', secondaryMuscles: ['Deep core', 'hip stabilizers'], secondaryMusclesHe: ['ליבה עמוקה', 'מייצבי אגן'] },
    'triceps-pushdown': { primaryMuscle: 'Triceps', primaryMuscleHe: 'יד אחורית', secondaryMuscles: ['Forearms', 'shoulder stabilizers'], secondaryMusclesHe: ['אמות', 'מייצבי כתף'] },
  }

  return muscles[template.id] ?? {
    primaryMuscle: 'Main target muscle',
    primaryMuscleHe: 'השריר המרכזי',
    secondaryMuscles: ['Core stabilizers'],
    secondaryMusclesHe: ['מייצבי ליבה'],
  }
}

function getExerciseTechnique(template: GymExerciseTemplate, level: UserProfile['fitnessLevel']) {
  const beginnerHe = level === 'beginner'
    ? 'התחל במשקל שמרגיש קל-בינוני כדי ללמוד את התנועה לפני שמעלים עומס.'
    : level === 'advanced'
      ? 'שמור שליטה מלאה והוסף עומס רק אם הקצב והטווח נשארים נקיים.'
      : 'בחר משקל שמאפשר חזרות נקיות בלי לאבד טכניקה.'
  const beginnerEn = level === 'beginner'
    ? 'Start with a light-to-moderate load so you learn the movement before increasing weight.'
    : level === 'advanced'
      ? 'Keep full control and add load only if tempo and range stay clean.'
      : 'Choose a load that lets you finish clean reps without losing technique.'

  const setupById: Record<string, { en: string; he: string }> = {
    'back-extension': { en: 'Set the pad just below the hips so the spine can hinge freely.', he: 'כוון את הריפוד מעט מתחת לאגן כדי שהגב יוכל לנוע בחופשיות.' },
    'cable-crunch': { en: 'Attach a rope to a high pulley, kneel down, and hold the rope beside the head.', he: 'חבר חבל לפולי עליון, רד לברכיים והחזק את החבל ליד הראש.' },
    'cable-fly': { en: 'Set both cable handles around chest height and stand centered between the towers.', he: 'כוון את שתי ידיות הכבל לגובה החזה ועמוד במרכז בין העמודים.' },
    'cable-lateral-raise': { en: 'Set the pulley low, stand side-on to the cable, and hold the handle with the outside hand.', he: 'כוון פולי תחתון, עמוד עם הצד לכבל והחזק את הידית ביד החיצונית.' },
    'cable-row': { en: 'Sit tall with feet braced, knees soft, and the handle at lower-rib height.', he: 'שב זקוף עם רגליים נתמכות, ברכיים רכות והידית בגובה הצלעות התחתונות.' },
    'calf-raise': { en: 'Place the balls of the feet on the platform and set the shoulder pads comfortably.', he: 'מקם את כריות כף הרגל על הפלטפורמה וכוונן את כריות הכתפיים בנוחות.' },
    'chest-press': { en: 'Adjust the seat so the handles start around mid-chest and the feet stay flat.', he: 'כוון את המושב כך שהידיות מתחילות בגובה מרכז החזה והרגליים יציבות על הרצפה.' },
    'chest-supported-row': { en: 'Set the pad so the chest is supported and the arms can reach the handles without rounding.', he: 'כוון את הריפוד כך שהחזה נתמך והידיים מגיעות לידיות בלי לעגל גב.' },
    'face-pull': { en: 'Set the rope around upper-chest to face height and step back until the cable is lightly tense.', he: 'כוון את החבל בין גובה חזה עליון לפנים וצעד אחורה עד שיש מתח קל בכבל.' },
    'hammer-curl': { en: 'Stand tall with dumbbells at the sides and palms facing each other.', he: 'עמוד זקוף עם משקולות בצדי הגוף וכפות ידיים פונות זו לזו.' },
    'hanging-knee-raise': { en: 'Support yourself on the captain chair or hang from the bar with shoulders packed down.', he: 'התייצב בכיסא קפטן או תלייה כשהכתפיים נמוכות ויציבות.' },
    'incline-db-press': { en: 'Set the bench to a moderate incline and start with dumbbells above the upper chest.', he: 'כוון את הספסל לשיפוע מתון והתחל עם המשקולות מעל החזה העליון.' },
    'lat-pulldown': { en: 'Set the thigh pad snugly, grip the bar slightly wider than shoulders, and sit tall.', he: 'כוון את כרית הירכיים צמודה, אחוז מעט רחב מהכתפיים ושב זקוף.' },
    'leg-curl': { en: 'Align the knee with the machine pivot and place the ankle pad just above the heels.', he: 'יישר את הברך עם ציר המכונה ומקם את כרית הקרסול מעט מעל העקבים.' },
    'leg-extension': { en: 'Align the knee with the pivot and place the shin pad above the ankle, not on the foot.', he: 'יישר את הברך עם הציר ומקם את כרית השוק מעל הקרסול, לא על כף הרגל.' },
    'leg-press': { en: 'Set the seat so the bottom position gives a comfortable knee bend without the hips lifting.', he: 'כוון את המושב כך שבתחתית יש כיפוף ברך נוח בלי שהאגן מתרומם.' },
    'machine-shoulder-press': { en: 'Adjust the seat so the handles start around shoulder height and the back pad supports you.', he: 'כוון את המושב כך שהידיות מתחילות בגובה הכתפיים והגב נתמך בריפוד.' },
    'pec-deck': { en: 'Set the seat so elbows and handles are around chest height.', he: 'כוון את המושב כך שהמרפקים והידיות בגובה החזה.' },
    'preacher-curl': { en: 'Set the pad so the upper arms rest fully while the armpits stay just above the edge.', he: 'כוון את הכרית כך שהזרועות נשענות מלא ובית השחי מעט מעל הקצה.' },
    'rear-delt-machine': { en: 'Face the pad, set handles at shoulder height, and keep the chest supported.', he: 'פנה אל הריפוד, כוון ידיות לגובה הכתפיים ושמור חזה נתמך.' },
    'single-arm-row': { en: 'Set the cable at mid-height and stand or sit with the ribs stacked over the hips.', he: 'כוון את הכבל לגובה בינוני ועמוד או שב כשהצלעות מעל האגן.' },
    'smith-squat': { en: 'Set the bar around upper-chest height and place feet where the squat feels balanced.', he: 'כוון את המוט לגובה חזה עליון ומקם רגליים במקום שבו הסקוואט מרגיש יציב.' },
    'torso-rotation': { en: 'Set the seat and pads so the hips stay fixed while the torso rotates.', he: 'כוון מושב וריפודים כך שהאגן נשאר מקובע בזמן שהגו מסתובב.' },
    'triceps-pushdown': { en: 'Set the pulley high, stand close, and pin the elbows beside the ribs.', he: 'כוון פולי עליון, עמוד קרוב וקבע מרפקים ליד הצלעות.' },
  }
  const setup = setupById[template.id] ?? { en: template.instruction, he: template.instructionHe }

  const actionHe = template.focus === 'legs'
    ? 'התחל את התנועה דרך כפות הרגליים ושמור ברכיים בכיוון האצבעות.'
    : template.focus === 'back'
      ? 'התחל מהשכמות: משוך אותן לאחור ולמטה לפני שהידיים מסיימות את התנועה.'
      : template.focus === 'chest'
        ? 'דחוף או קרב את הידיות דרך החזה, בלי להרים כתפיים.'
        : template.focus === 'arms'
          ? 'קבע את הזרוע העליונה ותן למרפק לבצע את רוב התנועה.'
          : template.focus === 'shoulders'
            ? 'הרם או לחץ דרך הכתפיים בלי להקשית גב תחתון.'
            : template.focus === 'abs'
              ? 'כווץ את הבטן לפני התנועה ושמור אגן יציב.'
              : 'התחל לאט, שמור גוף יציב ותן לשריר המטרה להוביל.'
  const actionEn = template.focus === 'legs'
    ? 'Start the movement through the feet and keep the knees tracking with the toes.'
    : template.focus === 'back'
      ? 'Lead with the shoulder blades: pull them back and down before the arms finish.'
      : template.focus === 'chest'
        ? 'Press or bring the handles through the chest without shrugging.'
        : template.focus === 'arms'
          ? 'Fix the upper arm and let the elbow joint drive most of the movement.'
          : template.focus === 'shoulders'
            ? 'Lift or press through the shoulders without arching the lower back.'
            : template.focus === 'abs'
              ? 'Brace the abs before moving and keep the pelvis stable.'
              : 'Start slowly, keep the body stable, and let the target muscle lead.'

  return {
    executionSteps: [
      setup.en,
      actionEn,
      'Breathe in before the effort, then breathe out through the hardest part of the rep.',
      'Use a controlled range: go as far as you can without pain, bouncing, or losing posture.',
      'Finish each rep by returning slowly to the start position while keeping tension on the muscle.',
      beginnerEn,
    ],
    executionStepsHe: [
      setup.he,
      actionHe,
      'שאף לפני המאמץ ונשוף בחלק הקשה של החזרה.',
      'עבוד בטווח נשלט: עד המקום שבו אין כאב, תנופה או איבוד יציבה.',
      'סיים כל חזרה בחזרה איטית לנקודת ההתחלה תוך שמירה על מתח בשריר.',
      beginnerHe,
    ],
  }
}

function getExerciseMistakes(template: GymExerciseTemplate) {
  const base = {
    mistakes: ['Using a weight that forces momentum.', 'Rushing the lowering phase.', 'Holding the breath through the whole set.'],
    mistakesHe: ['בחירת משקל שמכריח תנופה.', 'ירידה מהירה מדי בלי שליטה.', 'עצירת נשימה לאורך כל הסט.'],
  }
  const byFocus: Record<GymFocus, { mistakes: string[]; mistakesHe: string[] }> = {
    abs: { mistakes: ['Pulling with the arms instead of the abs.', 'Arching the lower back.', 'Moving too fast and losing core tension.'], mistakesHe: ['משיכה עם הידיים במקום כיווץ בטן.', 'הקשתת גב תחתון.', 'תנועה מהירה מדי ואיבוד מתח בליבה.'] },
    arms: { mistakes: ['Swinging the torso.', 'Letting the elbows drift forward or sideways.', 'Cutting the range short to lift more weight.'], mistakesHe: ['תנופה עם הגוף.', 'בריחת מרפקים קדימה או לצדדים.', 'קיצור טווח כדי להרים יותר משקל.'] },
    back: { mistakes: ['Rounding the back.', 'Pulling only with the biceps.', 'Shrugging the shoulders toward the ears.'], mistakesHe: ['עיגול הגב.', 'משיכה רק עם היד הקדמית.', 'הרמת כתפיים לכיוון האוזניים.'] },
    chest: { mistakes: ['Flaring the elbows too high.', 'Letting the shoulders roll forward.', 'Locking the elbows aggressively at the top.'], mistakesHe: ['מרפקים גבוהים מדי לצדדים.', 'כתפיים מתגלגלות קדימה.', 'נעילת מרפקים חזקה בסוף התנועה.'] },
    full: base,
    legs: { mistakes: ['Knees collapsing inward.', 'Lifting the hips off the pad or seat.', 'Locking the knees at the end of the rep.'], mistakesHe: ['ברכיים קורסות פנימה.', 'הרמת אגן מהריפוד או המושב.', 'נעילת ברכיים בסוף החזרה.'] },
    shoulders: { mistakes: ['Arching the lower back.', 'Shrugging instead of moving from the shoulder.', 'Using a load that shortens the range.'], mistakesHe: ['הקשתת גב תחתון.', 'הרמת שכמות במקום תנועה מהכתף.', 'משקל שמקצר את טווח התנועה.'] },
  }

  return byFocus[template.focus] ?? base
}

function getExerciseTips(template: GymExerciseTemplate, goal: GymGoal) {
  const goalTip = goal === 'strength'
    ? { en: 'For strength, rest fully and make every rep powerful but controlled.', he: 'לכוח, נוח מספיק ובצע כל חזרה חזקה אבל נשלטת.' }
    : goal === 'endurance'
      ? { en: 'For muscular endurance, keep the movement smooth and avoid turning the set into sloppy speed.', he: 'לסיבולת שריר, שמור תנועה חלקה ואל תהפוך את הסט למהירות לא נקייה.' }
      : { en: 'For muscle growth, feel the target muscle stretch and squeeze on every rep.', he: 'לבניית שריר, הרגש מתיחה וכיווץ של השריר בכל חזרה.' }
  const focusTip = template.focus === 'back'
    ? { en: 'Think elbows to pockets, not hands to chest.', he: 'חשוב “מרפקים לכיסים”, לא “ידיים לחזה”.' }
    : template.focus === 'chest'
      ? { en: 'Keep the chest proud and the shoulders quiet.', he: 'שמור חזה פתוח וכתפיים שקטות.' }
      : template.focus === 'legs'
        ? { en: 'Press evenly through the foot instead of pushing only through the toes.', he: 'דחוף דרך כל כף הרגל ולא רק דרך האצבעות.' }
        : template.focus === 'shoulders'
          ? { en: 'Stop the set if the neck takes over instead of the shoulder.', he: 'עצור אם הצוואר עובד במקום הכתף.' }
          : template.focus === 'arms'
            ? { en: 'Keep the wrist neutral so the elbow does the work.', he: 'שמור שורש כף יד ניטרלי כדי שהמרפק יעשה את העבודה.' }
            : template.focus === 'abs'
              ? { en: 'Exhale hard as the ribs move toward the pelvis.', he: 'נשוף חזק כשהצלעות מתקרבות לאגן.' }
              : { en: 'Use the first set to find a clean rhythm before adding effort.', he: 'השתמש בסט הראשון כדי למצוא קצב נקי לפני שמעלים מאמץ.' }

  return {
    tips: [focusTip.en, goalTip.en, `Safety cue: stop if you feel sharp pain, dizziness, or unusual shortness of breath.`],
    tipsHe: [focusTip.he, goalTip.he, 'דגש בטיחות: עצור אם יש כאב חד, סחרחורת או קוצר נשימה חריג.'],
  }
}

function getMachineUse(template: GymExerciseTemplate) {
  const lowerEquipment = template.equipment.toLowerCase()
  const isMachine = /machine|cable|pulley|smith|station|bench|chair|row|press|deck/.test(lowerEquipment)
  if (!isMachine) return {}

  const cableHe = lowerEquipment.includes('cable') || lowerEquipment.includes('pulley')
    ? 'אם יש פין או ידית בכבל, ודא שהפין מוכנס עד הסוף ושהידית מחוברת היטב לפני הסט.'
    : 'אם יש פין משקולות, הכנס אותו עד הסוף ובחר עומס שמאפשר חזרות נקיות.'
  const cableEn = lowerEquipment.includes('cable') || lowerEquipment.includes('pulley')
    ? 'If the cable uses a pin or handle, make sure the pin is fully inserted and the handle is clipped in before the set.'
    : 'If the stack uses a weight pin, push it fully in and choose a load that allows clean reps.'

  return {
    machineUse: [
      `Adjust the seat or pad so the working joint lines up with the machine axis or handle path.`,
      `Start with a conservative weight for the first set, then adjust only if every rep is controlled.`,
      `Keep hands and feet on the intended handles or platforms; do not grip moving parts.`,
      cableEn,
      `Enter and exit slowly after the weight stack is fully resting.`,
    ],
    machineUseHe: [
      'כוון מושב או ריפוד כך שהמפרק שעובד מיושר עם ציר המכונה או מסלול הידית.',
      'התחל במשקל שמרני בסט הראשון והעלה רק אם כל החזרות נקיות.',
      'מקם ידיים ורגליים רק על הידיות או הפלטפורמות המיועדות; אל תאחוז בחלקים נעים.',
      cableHe,
      'היכנס וצא מהמכונה לאט רק אחרי שהמשקולות חזרו למנוחה מלאה.',
    ],
  }
}

function createGymExerciseCoaching(
  template: GymExerciseTemplate,
  goal: GymGoal,
  level: UserProfile['fitnessLevel'],
  restSeconds: number,
): ExerciseCoachingDetails {
  const muscles = getExerciseMuscles(template)
  const technique = getExerciseTechnique(template, level)
  const mistakes = getExerciseMistakes(template)
  const tips = getExerciseTips(template, goal)
  const machine = getMachineUse(template)
  const difficulty = level === 'advanced' ? 'hard' : level === 'beginner' ? 'easy' : 'medium'
  const tempo = goal === 'strength' ? '2-1-1' : goal === 'endurance' ? '2-0-2' : '3-1-1'
  const tempoHe = goal === 'strength' ? '2 שניות ירידה, עצירה קצרה, עלייה חזקה' : goal === 'endurance' ? '2 שניות לכל כיוון בלי עצירה' : '3 שניות ירידה, עצירה קצרה, עלייה נשלטת'

  return {
    ...muscles,
    ...technique,
    commonMistakes: mistakes.mistakes,
    commonMistakesHe: mistakes.mistakesHe,
    ...tips,
    ...machine,
    aiTip: `Personal coach tip: keep ${template.name.toLowerCase()} at a clean tempo, rest ${restSeconds} seconds, and stop the set before technique breaks.`,
    aiTipHe: `טיפ מאמן אישי: בצע ${template.nameHe} בקצב נקי, נוח ${restSeconds} שניות, ועצור את הסט לפני שהטכניקה נשברת.`,
    difficulty,
    goal: `Build safe ${getGymGoalName(goal, 'en').toLowerCase()} while learning the correct movement pattern.`,
    goalHe: `לבנות ${getGymGoalName(goal, 'he')} בצורה בטוחה תוך לימוד תנועה נכונה.`,
    tempo,
    tempoHe,
  }
}

function buildGymWorkout({
  duration,
  focuses,
  goal,
  profile,
  progress,
}: {
  duration: GymDuration
  focuses: GymFocus[]
  goal: GymGoal
  profile: UserProfile
  progress: WorkoutProgressEntry[]
}): Workout {
  const progressSummary = analyzeGymProgress(progress, profile)
  const prescription = getGymPrescription(goal, profile.fitnessLevel, progressSummary.mode, duration)
  const repSeconds = prescription.reps * 4   // ~4 sec/rep on machines
  const exerciseCount = calcGymExerciseCount(duration, prescription.sets, repSeconds, prescription.restSeconds)
  const safeFocuses: GymFocus[] = focuses.length > 0 ? focuses : ['full']
  const templates = selectGymExerciseTemplates(safeFocuses, exerciseCount)
  const focusNamesHe = getGymFocusNames(safeFocuses, 'he')
  const focusNamesEn = getGymFocusNames(safeFocuses, 'en')
  const goalHe = getGymGoalName(goal, 'he')
  const goalEn = getGymGoalName(goal, 'en')
  const progressNoteHe = getGymProgressNote(progressSummary, 'he')
  const progressNoteEn = getGymProgressNote(progressSummary, 'en')

  return {
    id: `gym-custom-${Date.now()}`,
    category: 'gym',
    name: `Gym ${goalEn} - ${focusNamesEn}`,
    nameHe: `אימון חדר כושר ${goalHe} - ${focusNamesHe}`,
    durationMinutes: duration,
    difficulty: getGymDifficulty(profile.fitnessLevel, progressSummary.mode),
    type: 'strength',
    targetMuscles: safeFocuses,
    summary: `${progressNoteEn} Gym work time (including rest): ${duration} minutes. Warm-up and stretching are outside this time. Equipment: gym machines, cables, benches, and free weights.`,
    summaryHe: `${progressNoteHe} זמן עבודה בחדר כושר (כולל מנוחות): ${duration} דקות. חימום ומתיחות לא נספרים בזמן הזה. ציוד: מכונות, כבלים, ספסלים ומשקולות חופשיות.`,
    exercises: templates.map((template, index) => {
      const coaching = createGymExerciseCoaching(template, goal, profile.fitnessLevel, prescription.restSeconds)
      return {
        coaching,
        id: `gym-${template.id}-${index}`,
        name: template.name,
        nameHe: template.nameHe,
        reps: prescription.reps,
        durationSeconds: repSeconds, // ~4 sec/rep on machines → triggers exercise countdown timer
        restSeconds: prescription.restSeconds,
        sets: prescription.sets,
        instruction: `${template.instruction} Equipment: ${template.equipment}.`,
        instructionHe: `${template.instructionHe} ציוד: ${template.equipmentHe}.`,
      }
    }),
  }
}

function getGymBuilderText(language: 'en' | 'he') {
  if (language === 'he') {
    return {
      duration: 'כמה זמן עבודה בחדר כושר יש לך?',
      durationNote: 'זמן העבודה כולל את כל המנוחות בין הסטים. חימום ומתיחות לא נספרים בזמן הזה.',
      empty: 'בחר מטרה, כמה אזורי גוף וזמן אימון. SmartFit יבנה אימון חדר כושר לפי ההתקדמות שלך.',
      equipment: 'ציוד מותאם: מכונות, כבלים, ספסל ומשקולות חופשיות לפי התרגילים שנבחרו.',
      focus: 'על מה לעבוד? אפשר לבחור כמה אזורים',
      generate: 'צור אימון חדר כושר',
      goal: 'מטרת האימון',
      progress: 'התאמה לפי התקדמות',
      selected: 'אימון חדר כושר שנוצר',
      start: 'התחל אימון חדר כושר',
      subtitle: 'בחר מטרה, כמה אזורי גוף וזמן עד 90 דקות. כמות התרגילים משתנה לפי זמן העבודה והעומס מותאם להתקדמות שלך.',
      title: 'בונה אימון חדר כושר',
      totalTime: 'זמן עבודה כולל',
    }
  }

  return {
    duration: 'How much gym work time do you have?',
    durationNote: 'Work time includes all rest periods between sets. Warm-up and stretching are outside this time.',
    empty: 'Choose a goal, multiple body areas, and a duration. SmartFit will build a gym workout based on your progress.',
    equipment: 'Adapted equipment: machines, cables, bench, and free weights according to the selected exercises.',
    focus: 'What should we train? You can select multiple areas',
    generate: 'Create Gym Workout',
    goal: 'Workout goal',
    progress: 'Progress-based adaptation',
    selected: 'Generated gym workout',
    start: 'Start Gym Workout',
    subtitle: 'Choose a goal, multiple body areas, and up to 90 minutes. Exercise count changes by work time and load adapts to your progress.',
    title: 'Gym Workout Builder',
    totalTime: 'Total work time',
  }
}

function scaleTrainingValue(value: number, multiplier: number) {
  return Math.max(1, Math.round(value * multiplier))
}

function getAgeAdjustedExercise(exercise: Exercise, guidance: AgeGuidance): Exercise {
  return {
    ...exercise,
    sets: scaleTrainingValue(exercise.sets, guidance.workoutMultiplier),
    reps: scaleTrainingValue(exercise.reps, guidance.workoutMultiplier),
    durationSeconds: exercise.durationSeconds
      ? Math.max(10, scaleTrainingValue(exercise.durationSeconds, guidance.workoutMultiplier))
      : undefined,
    restSeconds: exercise.restSeconds + guidance.restBonusSeconds,
  }
}

function getAgeAdjustedAerobic(workout: AerobicWorkout, guidance: AgeGuidance) {
  return {
    durationMinutes: Math.max(10, Math.round(workout.durationMinutes * guidance.aerobicMultiplier)),
    baseDistanceKm: Number((workout.baseDistanceKm * guidance.aerobicMultiplier).toFixed(1)),
    baseCalories: Math.max(20, Math.round(workout.baseCalories * guidance.aerobicMultiplier)),
    avgHeartRate: Math.max(90, workout.avgHeartRate + guidance.heartRateAdjustment),
  }
}

function cleanShortSentence(text?: string) {
  return (text || '').replace(/\s+/g, ' ').replace(/[.。]+$/g, '').trim()
}

function getShortTechniqueCue(exercise: Exercise, details: ExerciseCoachingDetails, isHebrew: boolean) {
  const mistakes = isHebrew ? details.commonMistakesHe : details.commonMistakes
  const mistake = cleanShortSentence(mistakes[0])
  const lowerName = `${exercise.name} ${exercise.nameHe}`.toLowerCase()
  const levelCue = details.difficulty === 'easy'
    ? isHebrew
      ? 'התחל קל ושמור תנועה נקייה'
      : 'Start light and keep every rep clean'
    : details.difficulty === 'hard'
      ? isHebrew
        ? 'שמור טווח מלא ושליטה בירידה'
        : 'Use full range and control the lowering'
      : isHebrew
        ? 'בחר עומס שמאפשר שליטה'
        : 'Choose a load you can control'

  const focusCue = /leg|squat|lunge|רגל|סקוואט|לאנג|ברך/.test(lowerName)
    ? isHebrew
      ? 'ברכיים נשארות בכיוון האצבעות'
      : 'Keep knees tracking with the toes'
    : /row|pulldown|back|חתירה|גב|פולי/.test(lowerName)
      ? isHebrew
        ? 'כתפיים נמוכות ומשיכה מהגב'
        : 'Keep shoulders down and pull from the back'
      : /press|fly|chest|חזה|לחיצת/.test(lowerName)
        ? isHebrew
          ? 'חזה פתוח בלי נעילת מרפקים חזקה'
          : 'Keep chest open and avoid hard elbow lockout'
        : /shoulder|כתף|כתפיים/.test(lowerName)
          ? isHebrew
            ? 'צלעות אסופות בלי הקשתת גב'
            : 'Keep ribs down without arching the back'
          : /crunch|plank|בטן|ליבה/.test(lowerName)
            ? isHebrew
              ? 'בטן אסופה ונשימה רציפה'
              : 'Brace the abs and keep breathing'
            : isHebrew
              ? 'עבוד בשליטה בלי תנופה'
              : 'Move with control, not momentum'

  if (!mistake) return `${focusCue}. ${levelCue}.`
  return isHebrew
    ? `${focusCue}. ${levelCue}; הימנע מ${mistake}.`
    : `${focusCue}. ${levelCue}; avoid ${mistake.toLowerCase()}.`
}

function getShortMachineCue(exercise: Exercise, details: ExerciseCoachingDetails, isHebrew: boolean) {
  const machineUse = isHebrew ? details.machineUseHe : details.machineUse
  if (!machineUse?.length) return ''

  const lower = `${exercise.name} ${exercise.nameHe} ${exercise.instruction} ${exercise.instructionHe}`.toLowerCase()
  if (/lat|pulldown|פולי/.test(lower)) {
    return isHebrew
      ? 'מושב עם כרית ירכיים וכבל עליון; נעל את הכרית ומשוך את המוט לחזה.'
      : 'Seat with thigh pad and overhead cable; lock the pad and pull the bar to the chest.'
  }
  if (/leg press|לחיצת רגל/.test(lower)) {
    return isHebrew
      ? 'מושב משופע עם פלטפורמה לרגליים; כוון מושב כך שהברכיים מתכופפות בנוחות.'
      : 'Angled seat with foot platform; set the seat so the knees bend comfortably.'
  }
  if (/chest press|לחיצת חזה/.test(lower)) {
    return isHebrew
      ? 'משענת עם ידיות דחיפה מול החזה; כוון את הידיות לגובה מרכז החזה.'
      : 'Back pad with push handles in front of the chest; set handles around mid-chest.'
  }
  if (/shoulder press|לחיצת כתפ/.test(lower)) {
    return isHebrew
      ? 'מושב זקוף עם ידיות ליד הכתפיים; שמור גב צמוד למשענת.'
      : 'Upright seat with handles near the shoulders; keep the back on the pad.'
  }
  if (/cable|כבל|pushdown|fly|face pull/.test(lower)) {
    return isHebrew
      ? 'עמדת כבלים עם ידית או חבל; בדוק קליפס ופין משקולות לפני הסט.'
      : 'Cable tower with handle or rope; check the clip and weight pin before the set.'
  }
  if (/smith|סמית/.test(lower)) {
    return isHebrew
      ? 'מוט מודרך על מסילות; סובב לנעילה בטוחה לפני יציאה.'
      : 'Guided bar on rails; rotate it into the hooks before stepping away.'
  }

  return isHebrew
    ? 'מכונה עם מושב/ריפוד וידיות עבודה; כוון גובה ובחר משקל נשלט.'
    : 'Machine with seat or pad and handles; adjust height and choose a controlled load.'
}

function ExerciseCoachingDetailsView({ compact, exercise }: { compact?: boolean; exercise: Exercise }) {
  const { isHebrew } = useI18n()
  const details = exercise.coaching
  if (!details) return null

  void compact
  const techniqueCue = getShortTechniqueCue(exercise, details, isHebrew)
  const machineCue = getShortMachineCue(exercise, details, isHebrew)

  return (
    <div className="meal-expanded">
      <p className="exercise-list-note">
        <strong>{isHebrew ? 'דגש' : 'Technique'}:</strong> {techniqueCue}
      </p>
      {machineCue && (
        <p className="exercise-list-note">
          <strong>{isHebrew ? 'מכונה' : 'Machine'}:</strong> {machineCue}
        </p>
      )}
    </div>
  )
}

function GymWorkoutBuilderPanel({
  generatedWorkout,
  gymDuration,
  gymFocuses,
  gymGoal,
  gymProgress,
  onDurationChange,
  onGenerateWorkout,
  onGoalChange,
  onStartWorkout,
  onToggleFocus,
}: {
  generatedWorkout: Workout | null
  gymDuration: GymDuration
  gymFocuses: GymFocus[]
  gymGoal: GymGoal
  gymProgress: GymProgressSummary
  onDurationChange: (duration: GymDuration) => void
  onGenerateWorkout: () => void
  onGoalChange: (goal: GymGoal) => void
  onStartWorkout: () => void
  onToggleFocus: (focus: GymFocus) => void
}) {
  const { isHebrew, language, t } = useI18n()
  const text = getGymBuilderText(language)
  const exerciseCount = getGymExerciseCount(gymDuration)
  // Track which exercises show the dumbbell alternative
  const [noMachineSet, setNoMachineSet] = useState<Set<string>>(new Set())
  const toggleNoMachine = (id: string) =>
    setNoMachineSet(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <>
      <div className="workout-card-big">
      <div className="workout-card-top">
        <div>
          <p className="workout-card-label">{t('gymWorkout')}</p>
          <h2 className="workout-card-name">{text.title}</h2>
        </div>
        <span className="difficulty-badge medium">{exerciseCount} {t('exercises')}</span>
      </div>
      <p className="exercise-focus-instruction">{text.subtitle}</p>

      <div className="form-section">
        <p className="form-label">{text.goal}</p>
        <div className="option-grid col-3">
          {GYM_GOAL_OPTIONS.map(option => (
            <button
              key={option.key}
              className={`option-card compact${gymGoal === option.key ? ' selected' : ''}`}
              onClick={() => onGoalChange(option.key)}
              type="button"
            >
              <span className="option-label">{isHebrew ? option.labelHe : option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <p className="form-label">{text.focus}</p>
        <div className="option-grid col-3">
          {GYM_FOCUS_OPTIONS.map(option => (
            <button
              key={option.key}
              className={`option-card compact${gymFocuses.includes(option.key) ? ' selected' : ''}`}
              onClick={() => onToggleFocus(option.key)}
              type="button"
            >
              <span className="option-label">{isHebrew ? option.labelHe : option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <p className="form-label">{text.duration}</p>
        <div className="option-grid col-4">
          {GYM_DURATIONS.map(duration => (
            <button
              key={duration}
              className={`option-card compact${gymDuration === duration ? ' selected' : ''}`}
              onClick={() => onDurationChange(duration)}
              type="button"
            >
              <span className="option-label">{duration} {t('minutes')}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="age-note compact">
        <strong>{text.progress}</strong>
        <span>{getGymProgressNote(gymProgress, language)}</span>
      </p>

        <button className="btn-primary btn-start" onClick={onGenerateWorkout}>
          {text.generate}
        </button>
      </div>

      {generatedWorkout ? (
        <div className="workout-card-big">
          <div className="workout-card-top">
            <div>
              <p className="workout-card-label">{text.selected}</p>
              <h2 className="workout-card-name">{isHebrew ? generatedWorkout.nameHe : generatedWorkout.name}</h2>
            </div>
            <span className={`difficulty-badge ${generatedWorkout.difficulty}`}>{generatedWorkout.difficulty}</span>
          </div>
          <p className="exercise-focus-instruction">{isHebrew ? generatedWorkout.summaryHe : generatedWorkout.summary}</p>
          <p className="exercise-focus-instruction">{text.equipment}</p>
          <div className="workout-card-meta">
            <span>{text.totalTime}: {generatedWorkout.durationMinutes} {t('minutes')}</span>
            <span>{generatedWorkout.exercises.length} {t('exercises')}</span>
          </div>
          <ul className="exercise-list">
            {generatedWorkout.exercises.map((exercise, index) => {
              const baseId = exercise.id.replace(/^gym-/, '').replace(/-\d+$/, '')
              const altData = DUMBBELL_ALTERNATIVES[baseId]
              const showAlt = noMachineSet.has(exercise.id)
              return (
                <li key={`generated-gym-exercise-${exercise.id}-${index}`} className="exercise-list-item gym-exercise-item">
                  <ExerciseAnimation exerciseName={exercise.name} isActive={false} />
                  <div className="exercise-list-info">
                    <span className="exercise-list-name">
                      {showAlt && altData
                        ? (isHebrew ? altData.nameHe : altData.name)
                        : (isHebrew ? exercise.nameHe : exercise.name)}
                    </span>
                    <span className="exercise-list-detail">
                      {exercise.sets} {t('set')} × {exercise.reps} {t('reps')}
                      {exercise.durationSeconds ? ` · ⏱ ${exercise.durationSeconds}s` : ''}
                      {' · '}😴 {exercise.restSeconds}s {t('rest')}
                    </span>
                    <span className="exercise-list-note">
                      {showAlt && altData
                        ? (isHebrew ? altData.instructionHe : altData.instruction)
                        : (isHebrew ? exercise.instructionHe : exercise.instruction)}
                    </span>
                    {altData && (
                      <button
                        type="button"
                        onClick={() => toggleNoMachine(exercise.id)}
                        style={{
                          marginTop: 6, padding: '4px 10px', borderRadius: 16, border: 'none',
                          cursor: 'pointer', fontWeight: 700, fontSize: 12,
                          background: showAlt ? '#f59e0b22' : 'rgba(255,255,255,0.08)',
                          color: showAlt ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {showAlt
                          ? (isHebrew ? '🏋️ חזור למכונה' : '🏋️ Back to machine')
                          : (isHebrew ? '🚫 אין מכונה — תרגיל חלופי' : '🚫 No machine — show alternative')}
                      </button>
                    )}
                    {!showAlt && (
                      <ExerciseCoachingDetailsView
                        compact={generatedWorkout.durationMinutes <= 20}
                        exercise={exercise}
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <button className="btn-primary btn-start" onClick={onStartWorkout}>
            {text.start}
          </button>
        </div>
      ) : (
        <p className="workout-picker-sub">{text.empty}</p>
      )}
    </>
  )
}

function SelectWorkout({
  generatedGymWorkout,
  gymDuration,
  gymFocuses,
  gymGoal,
  gymProgress,
  selectedChoice,
  selectedWorkout,
  selectedAerobic,
  onGenerateGymWorkout,
  onGymDurationChange,
  onGymGoalChange,
  onSelectChoice,
  onSelectAerobic,
  onStartWorkout,
  onStartAerobic,
  onToggleGymFocus,
}: {
  generatedGymWorkout: Workout | null
  gymDuration: GymDuration
  gymFocuses: GymFocus[]
  gymGoal: GymGoal
  gymProgress: GymProgressSummary
  selectedChoice: WorkoutChoice
  selectedWorkout: Workout
  selectedAerobic: AerobicWorkout
  onGenerateGymWorkout: () => void
  onGymDurationChange: (duration: GymDuration) => void
  onGymGoalChange: (goal: GymGoal) => void
  onSelectChoice: (choice: WorkoutChoice) => void
  onSelectAerobic: (workout: AerobicWorkout) => void
  onStartWorkout: () => void
  onStartAerobic: () => void
  onToggleGymFocus: (focus: GymFocus) => void
}) {
  const { t, isHebrew, language } = useI18n()
  const { profile } = useUser()
  const navigate = useNavigate()
  const [showChangeGrid, setShowChangeGrid] = useState(false)
  const profileGoals = getProfileGoals(profile)
  const profileLocations = getProfileWorkoutTypes(profile)
  const ageGuidance = getAgeGuidance(profile)
  const adjustedWorkoutDuration = selectedWorkout.durationMinutes
  const adjustedExercises = selectedWorkout.exercises.map(exercise => getAgeAdjustedExercise(exercise, ageGuidance))
  const adjustedAerobic = getAgeAdjustedAerobic(selectedAerobic, ageGuidance)
  const heartRatePreview = getHeartRateSummary(language).text

  const workoutName = isHebrew ? selectedWorkout.nameHe : selectedWorkout.name
  const workoutSummary = isHebrew ? selectedWorkout.summaryHe : selectedWorkout.summary
  const aerobicName = isHebrew ? selectedAerobic.nameHe : selectedAerobic.name
  const aerobicSummary = isHebrew ? selectedAerobic.summaryHe : selectedAerobic.summary

  return (
    <div className="workout-preview">
      <div className="workout-preview-header">
        <h1 className="workout-title">{isHebrew ? 'האימון שלך היום' : "Today's Workout"}</h1>
      </div>

      {/* ── Today's workout card — always first ── */}
      {selectedChoice === 'aerobic' ? (
        <div className="workout-card-big">
          <div className="workout-card-top">
            <div>
              <p className="workout-card-label">{isHebrew ? 'אימון היום' : "Today's workout"}</p>
              <h2 className="workout-card-name">{aerobicName}</h2>
            </div>
            <span className={`difficulty-badge ${selectedAerobic.difficulty}`}>{selectedAerobic.difficulty}</span>
          </div>
          <p className="exercise-focus-instruction">{aerobicSummary}</p>
          <div className="aerobic-stat-grid preview">
            <div><span>{t('distance')}</span><strong>{adjustedAerobic.baseDistanceKm} {t('km')}</strong></div>
            <div><span>{t('pace')}</span><strong>{selectedAerobic.avgPace}</strong></div>
            <div><span>{t('calories')}</span><strong>{adjustedAerobic.baseCalories} {t('kcal')}</strong></div>
            <div><span>{t('heartRate')}</span><strong>{heartRatePreview}</strong></div>
          </div>
          <button className="btn-primary btn-start" onClick={onStartAerobic}>
            {t('startAerobic')}
          </button>
        </div>
      ) : selectedChoice === 'gym' ? (
        <GymWorkoutBuilderPanel
          generatedWorkout={generatedGymWorkout}
          gymDuration={gymDuration}
          gymFocuses={gymFocuses}
          gymGoal={gymGoal}
          gymProgress={gymProgress}
          onDurationChange={onGymDurationChange}
          onGenerateWorkout={onGenerateGymWorkout}
          onGoalChange={onGymGoalChange}
          onStartWorkout={onStartWorkout}
          onToggleFocus={onToggleGymFocus}
        />
      ) : (
        <div className="workout-card-big">
          <div className="workout-card-top">
            <div>
              <p className="workout-card-label">{isHebrew ? 'אימון היום' : "Today's workout"}</p>
              <h2 className="workout-card-name">{workoutName}</h2>
            </div>
            <span className={`difficulty-badge ${selectedWorkout.difficulty}`}>{selectedWorkout.difficulty}</span>
          </div>
          <p className="exercise-focus-instruction">{workoutSummary}</p>
          <div className="workout-card-meta">
            <span>{adjustedWorkoutDuration} min</span>
            <span>{adjustedExercises.length} {t('exercises')}</span>
          </div>
          <ul className="exercise-list">
            {adjustedExercises.map((exercise, index) => (
              <li key={`workout-exercise-${selectedWorkout.id}-${exercise.id}-${index}`} className="exercise-list-item">
                <span className="exercise-num">{index + 1}</span>
                <div className="exercise-list-info">
                  <span className="exercise-list-name">{isHebrew ? exercise.nameHe : exercise.name}</span>
                  <span className="exercise-list-detail">
                    {exercise.sets} {t('set')} x {exercise.durationSeconds ? `${exercise.durationSeconds} ${t('seconds')}` : `${exercise.reps} ${t('reps')}`} - {exercise.restSeconds}s {t('rest')}
                  </span>
                  <span className="exercise-list-note">
                    {isHebrew ? exercise.instructionHe : exercise.instruction}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button className="btn-primary btn-start" onClick={onStartWorkout} disabled={selectedWorkout.exercises.length === 0}>
            {t('startWorkout')}
          </button>
        </div>
      )}

      {/* ── Change workout toggle ── */}
      <button
        className="training-plan-banner"
        onClick={() => setShowChangeGrid(v => !v)}
        style={{ marginTop: 4 }}
      >
        <span className="training-plan-banner-icon">🔄</span>
        <div className="training-plan-banner-text">
          <strong>{isHebrew ? 'שנה אימון' : 'Change workout'}</strong>
          <small>{isHebrew ? 'בחר סוג אימון אחר להיום' : 'Pick a different workout for today'}</small>
        </div>
        <span className="training-plan-banner-arrow">{showChangeGrid ? '▲' : '▼'}</span>
      </button>

      {showChangeGrid && (
        <>
          <div className="workout-choice-grid">
            {(['goal', 'abs', 'arms', 'legs', 'gym', 'aerobic'] as WorkoutChoice[]).map(choice => (
              <button
                key={choice}
                className={`workout-choice-card${selectedChoice === choice ? ' selected' : ''}`}
                onClick={() => { onSelectChoice(choice); setShowChangeGrid(false) }}
              >
                <span>{t(categoryLabelKeys[choice])}</span>
                {choice === 'goal' && <small>{t('goals')}: {profileGoals.map(goal => t(goalLabelKeys[goal])).join(', ')}</small>}
              </button>
            ))}
          </div>
          <p className="workout-picker-sub">
            {t('locations')}: {profileLocations.map(location => t(locationLabelKeys[location])).join(', ')}
          </p>
          <p className="age-note">
            <strong>{t('ageAdaptation')}: {t(ageGuidance.group)}</strong>
        <span>{t('ageWorkoutNote')}</span>
          </p>

          {selectedChoice === 'aerobic' && (
            <div className="aerobic-choice-list" style={{ marginTop: 12 }}>
              {mockAerobicWorkouts.map((workout, index) => (
                <button
                  key={`aerobic-choice-${workout.id}-${index}`}
                  className={`aerobic-choice-card${selectedAerobic.id === workout.id ? ' selected' : ''}`}
                  onClick={() => { onSelectAerobic(workout); setShowChangeGrid(false) }}
                >
                  <span>{isHebrew ? workout.nameHe : workout.name}</span>
                  <small>{getAgeAdjustedAerobic(workout, ageGuidance).durationMinutes} min - {getAgeAdjustedAerobic(workout, ageGuidance).baseDistanceKm} {t('km')}</small>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Extra links */}
      <button className="training-plan-banner" onClick={() => navigate('/social?tab=joint')} style={{ marginTop: 4 }}>
        <span className="training-plan-banner-icon">👥</span>
        <div className="training-plan-banner-text">
          <strong>{isHebrew ? 'אימון משותף עם חברים' : 'Co-workout with friends'}</strong>
          <small>{isHebrew ? 'פתח לובי וסיימו יחד' : 'Open a lobby and finish together'}</small>
        </div>
        <span className="training-plan-banner-arrow">›</span>
      </button>
    </div>
  )
}

function CountdownOverlay({ value }: { value: number }) {
  const { t } = useI18n()

  return (
    <div className="countdown-overlay">
      <div className="countdown-circle">{value === 0 ? 'GO!' : value}</div>
      <p className="countdown-label">{t('getReady')}</p>
    </div>
  )
}

function RestTimer({ seconds, onDone, onSkip }: { seconds: number; onDone: () => void; onSkip: () => void }) {
  const { t } = useI18n()
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) {
      onDone()
      return
    }
    const timer = window.setTimeout(() => setRemaining(value => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining, onDone])

  return (
    <div className="rest-timer-overlay">
      <p className="rest-label">{t('restTime')}</p>
      <div className="rest-countdown">{remaining}s</div>
      <button className="btn-ghost" onClick={onSkip}>{t('skipRest')}</button>
    </div>
  )
}

function SkipConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useI18n()

  return (
    <div className="skip-confirm-overlay">
      <div className="skip-confirm-card">
        <p>{t('skipQuestion')}</p>
        <div className="skip-confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>{t('cancel')}</button>
          <button className="btn-primary" onClick={onConfirm}>{t('skip')}</button>
        </div>
      </div>
    </div>
  )
}

function TimedExerciseTimer({
  seconds,
  onComplete,
}: {
  seconds: number
  onComplete: () => void
}) {
  const { t } = useI18n()
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    setRemaining(seconds)
    setRunning(false)
    setFinished(false)
  }, [seconds])

  useEffect(() => {
    if (!running || finished) return
    if (remaining <= 0) {
      setRunning(false)
      setFinished(true)
      return
    }

    const timer = window.setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [finished, remaining, running])

  return (
    <div className="timed-exercise-card">
      <p className="set-feedback-label">{t('startTimer')}</p>
      <div className="timed-exercise-clock">{formatTime(remaining)}</div>

      {!running && !finished && (
        <button className="btn-primary timed-exercise-btn" onClick={() => setRunning(true)}>
          {t('startTimer')}
        </button>
      )}

      {running && <p className="timed-exercise-state">{t('timerRunning')}</p>}

      {finished && (
        <>
          <p className="timed-exercise-state">{t('timerComplete')}</p>
          <button className="feedback-btn" onClick={onComplete}>
            {t('good')}
          </button>
        </>
      )}
    </div>
  )
}

function AerobicTracker({ workout, onFinish }: { workout: AerobicWorkout; onFinish: (summary: CardioSummary) => void }) {
  const { isHebrew } = useI18n()
  const { profile } = useUser()
  const [elapsed, setElapsed] = useState(0)
  const [trackedDistanceKm, setTrackedDistanceKm] = useState(0)
  const [locationStatus, setLocationStatus] = useState<LocationTrackerStatus>('idle')
  const finishedRef = useRef(false)

  const activityType = getCardioActivityType(`${workout.name} ${workout.nameHe}`)
  const durationMinutes = elapsed / 60
  const distanceKm = trackedDistanceKm
  const calories = estimateCardioCalories({ activityType, distanceKm, durationMinutes, weightKg: profile.weightKg })

  // Timer counts up freely — user stops when done
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(v => v + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // Auto-start GPS location tracking
  useEffect(() => {
    const tracker = startLocationTracker({
      onDistanceChange: setTrackedDistanceKm,
      onStatusChange: setLocationStatus,
    })
    return () => tracker.stop()
  }, [])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    onFinish({
      calories,
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMinutes: Math.max(1, Math.round(durationMinutes)),
      type: workout.id,
    })
  }, [calories, distanceKm, durationMinutes, onFinish, workout.id])

  const locationIcon =
    locationStatus === 'tracking' ? '📍' :
    locationStatus === 'requesting' ? '⏳' : '📵'

  const locationNote =
    locationStatus === 'tracking'
      ? isHebrew ? 'GPS פעיל' : 'GPS active'
      : locationStatus === 'requesting'
      ? isHebrew ? 'מבקש הרשאת מיקום...' : 'Requesting GPS...'
      : isHebrew ? 'אין גישה למיקום' : 'No location access'

  return (
    <div className="workout-active-layout aerobic-simple">
      <div className="aerobic-header">
        <p className="workout-card-label">{isHebrew ? workout.nameHe : workout.name}</p>
        <span className="aerobic-location-badge">{locationIcon} {locationNote}</span>
      </div>

      <div className="aerobic-big-timer">{formatTime(elapsed)}</div>

      <div className="aerobic-stats-row">
        <div className="aerobic-stat-box">
          <span>{isHebrew ? 'מרחק' : 'Distance'}</span>
          <strong>{distanceKm.toFixed(2)} {isHebrew ? 'ק״מ' : 'km'}</strong>
        </div>
        <div className="aerobic-stat-box">
          <span>{isHebrew ? 'קלוריות' : 'Calories'}</span>
          <strong>{calories} kcal</strong>
        </div>
      </div>

      <button className="btn-primary aerobic-finish-btn" onClick={finish}>
        {isHebrew ? '✓ סיימתי' : '✓ Finish'}
      </button>
    </div>
  )
}

export default function WorkoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, isHebrew } = useI18n()
  const { profile } = useUser()
  const ageGuidance = getAgeGuidance(profile)
  const [selectedChoice, setSelectedChoice] = useState<WorkoutChoice>(() => searchParams.get('mode') === 'gym' ? 'gym' : 'goal')
  const [selectedWorkout, setSelectedWorkout] = useState<Workout>(() => buildHomeWorkout('goal', profile))
  const [selectedAerobic, setSelectedAerobic] = useState<AerobicWorkout>(mockAerobicWorkouts[0])
  const [gymGoal, setGymGoal] = useState<GymGoal>(() => getDefaultGymGoal(profile))
  const [gymFocuses, setGymFocuses] = useState<GymFocus[]>(() => getDefaultGymFocuses(profile))
  const [gymDuration, setGymDuration] = useState<GymDuration>(() => getConfiguredGymDuration(profile))
  const [generatedGymWorkout, setGeneratedGymWorkout] = useState<Workout | null>(null)
  const [phase, setPhase] = useState<Phase>('select')
  const [countdown, setCountdown] = useState(3)
  const [exIndex, setExIndex] = useState(0)
  const [setIndex, setSetIndex] = useState(0)
  const [showSkip, setShowSkip] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<string | null>(null)
  const gymProgress = useMemo(() => analyzeGymProgress(getWorkoutProgress(), profile), [profile])

  // Live heart rate from BLE wearable
  const [liveHR, setLiveHR] = useState<number>(() => getCurrentHR())
  useEffect(() => {
    // Always subscribe — works even if watch connects after page load
    const unsub = onHeartRate(bpm => setLiveHR(bpm))
    return unsub
  }, [])

  // Map weekly plan focus → workout choice
  const focusToChoice = (focus: ScheduleFocus): WorkoutChoice | null => {
    if (focus === 'rest')    return null        // rest day — don't auto-select
    if (focus === 'aerobic') return 'aerobic'
    if (focus === 'abs')     return 'abs'
    if (focus === 'arms')    return 'arms'
    if (focus === 'legs')    return 'legs'
    return 'goal'  // 'goal' catch-all
  }

  // Always pre-generate a gym workout on mount so the card is immediately available.
  // Auto-switch selected choice based on today's weekly plan entry.
  useEffect(() => {
    const auto = buildGymWorkout({
      duration: gymDuration,
      focuses: gymFocuses,
      goal: gymGoal,
      profile,
      progress: getWorkoutProgress(),
    })
    setGeneratedGymWorkout(auto)

    const todayIndex = new Date().getDay() // 0=Sun … 6=Sat
    const todayKey = WEEK_DAYS[todayIndex]
    const isGymDay = (profile.gymDays ?? []).includes(todayKey)

    if (isGymDay) {
      // Gym day takes priority
      setSelectedWorkout(auto)
      setSelectedChoice('gym')
    } else {
      // Use the weekly plan focus
      const weeklyPlan = getProfileWeeklyPlan(profile)
      const todayFocus = weeklyPlan[todayKey]
      const choice = focusToChoice(todayFocus)
      if (choice && choice !== 'aerobic' && choice !== 'gym') {
        setSelectedWorkout(buildHomeWorkout(choice, profile))
        setSelectedChoice(choice)
      } else if (choice === 'aerobic') {
        setSelectedChoice('aerobic')
      }
    }
  }, []) // intentionally run only on mount

  const exercises = useMemo(
    () => selectedChoice === 'gym'
      ? selectedWorkout.exercises
      : selectedWorkout.exercises.map(exercise => getAgeAdjustedExercise(exercise, ageGuidance)),
    [ageGuidance.restBonusSeconds, ageGuidance.workoutMultiplier, selectedChoice, selectedWorkout],
  )
  const total = exercises.length
  const currentEx = exercises[exIndex]

  const resetWorkoutState = useCallback(() => {
    setExIndex(0)
    setSetIndex(0)
    setShowSkip(false)
    setLastFeedback(null)
    setCountdown(3)
  }, [])

  const handleSelectChoice = (choice: WorkoutChoice) => {
    setSelectedChoice(choice)
    if (choice === 'gym') {
      if (generatedGymWorkout) setSelectedWorkout(generatedGymWorkout)
    } else if (choice !== 'aerobic') {
      setSelectedWorkout(buildHomeWorkout(choice, profile))
    }
    resetWorkoutState()
  }

  const handleGymGoalChange = (goal: GymGoal) => {
    setGymGoal(goal)
    setGeneratedGymWorkout(null)
    resetWorkoutState()
  }

  const handleGymDurationChange = (duration: GymDuration) => {
    setGymDuration(duration)
    setGeneratedGymWorkout(null)
    resetWorkoutState()
  }

  const handleToggleGymFocus = (focus: GymFocus) => {
    setGymFocuses(prev => {
      if (focus === 'full') return ['full']
      const focused = prev.filter(item => item !== 'full')
      const next = focused.includes(focus)
        ? focused.filter(item => item !== focus)
        : [...focused, focus]
      return next.length > 0 ? next : ['full']
    })
    setGeneratedGymWorkout(null)
    resetWorkoutState()
  }

  const handleGenerateGymWorkout = useCallback(() => {
    const workout = buildGymWorkout({
      duration: gymDuration,
      focuses: gymFocuses,
      goal: gymGoal,
      profile,
      progress: getWorkoutProgress(),
    })
    setGeneratedGymWorkout(workout)
    setSelectedWorkout(workout)
    setSelectedChoice('gym')
    resetWorkoutState()
  }, [gymDuration, gymFocuses, gymGoal, profile, resetWorkoutState])

  const finishWorkout = useCallback((cardioSummary?: CardioSummary) => {
    const completionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const completedDuration = cardioSummary
      ? cardioSummary.durationMinutes
      : selectedWorkout.durationMinutes
    const sharedWorkout = cardioSummary
      ? {
          caloriesEstimate: cardioSummary.calories,
          durationMin: cardioSummary.durationMinutes,
          title: cardioSummary.type,
          titleHe: cardioSummary.type,
          type: 'cardio',
        }
      : {
          caloriesEstimate: Math.round(completedDuration * (selectedChoice === 'gym' ? 7 : 6)),
          durationMin: completedDuration,
          title: selectedWorkout.name,
          titleHe: selectedWorkout.nameHe,
          type: selectedChoice === 'gym'
            ? 'gym'
            : selectedWorkout.type === 'cardio'
            ? 'cardio'
            : selectedWorkout.type === 'flexibility'
            ? 'mobility'
            : 'strength',
          workoutId: selectedWorkout.id,
        }
    if (cardioSummary) {
      saveCardioSession({
        calories: cardioSummary.calories,
        distanceKm: cardioSummary.distanceKm,
        duration: cardioSummary.durationMinutes,
        type: cardioSummary.type,
      })
    } else {
      saveCompletedWorkout({
        duration: completedDuration,
        feeling: lastFeedback ?? undefined,
        id: completionId,
        type: selectedChoice,
      })
    }
    navigate('/workout/summary', { state: { completionId, sharedWorkout } })
  }, [lastFeedback, navigate, selectedChoice, selectedWorkout])

  const goToNext = useCallback(() => {
    if (!currentEx) {
      setPhase('done')
      return
    }

    const nextSet = setIndex + 1
    if (nextSet < currentEx.sets) {
      setSetIndex(nextSet)
      setPhase('rest')
    } else if (exIndex + 1 < total) {
      setExIndex(index => index + 1)
      setSetIndex(0)
      setPhase('rest')
    } else {
      setPhase('done')
    }
    setLastFeedback(null)
  }, [setIndex, currentEx, exIndex, total])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown === 0) {
      const timer = window.setTimeout(() => setPhase('active'), 600)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setCountdown(value => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [phase, countdown])

  useEffect(() => {
    if (phase === 'done') {
      const timer = window.setTimeout(finishWorkout, 300)
      return () => window.clearTimeout(timer)
    }
  }, [finishWorkout, phase])

  const handleStart = () => {
    if (total === 0) return
    resetWorkoutState()
    setPhase('countdown')
  }

  const handleStartAerobic = () => {
    resetWorkoutState()
    setPhase('aerobic')
  }

  const handleSetDone = (feedback: string) => {
    if (lastFeedback) return
    setLastFeedback(feedback)
    window.setTimeout(() => goToNext(), 800)
  }

  // For exercises without a timer — just go straight to rest
  const handleSetFinished = () => {
    goToNext()
  }

  const handleSkipConfirm = () => {
    setShowSkip(false)
    if (exIndex + 1 < total) {
      setExIndex(index => index + 1)
      setSetIndex(0)
      setPhase('active')
    } else {
      setPhase('done')
    }
  }

  if (phase === 'select') {
    return (
      <SelectWorkout
        generatedGymWorkout={generatedGymWorkout}
        gymDuration={gymDuration}
        gymFocuses={gymFocuses}
        gymGoal={gymGoal}
        gymProgress={gymProgress}
        selectedChoice={selectedChoice}
        selectedWorkout={selectedWorkout}
        selectedAerobic={selectedAerobic}
        onGenerateGymWorkout={handleGenerateGymWorkout}
        onGymDurationChange={handleGymDurationChange}
        onGymGoalChange={handleGymGoalChange}
        onSelectChoice={handleSelectChoice}
        onSelectAerobic={setSelectedAerobic}
        onStartWorkout={handleStart}
        onStartAerobic={handleStartAerobic}
        onToggleGymFocus={handleToggleGymFocus}
      />
    )
  }

  if (phase === 'aerobic') return <AerobicTracker workout={selectedAerobic} onFinish={finishWorkout} />

  if (!currentEx && phase !== 'countdown') {
    return (
      <div className="workout-preview">
        <h1 className="workout-title">{t('noWorkout')}</h1>
        <button className="btn-primary btn-start" onClick={() => navigate('/dashboard')}>{t('backDashboard')}</button>
      </div>
    )
  }

  if (phase === 'countdown') return <CountdownOverlay value={countdown} />
  if (phase === 'rest' && currentEx) {
    return (
      <RestTimer
        seconds={currentEx.restSeconds}
        onDone={() => setPhase('active')}
        onSkip={() => setPhase('active')}
      />
    )
  }

  if (!currentEx) return null

  const hrZone = liveHR > 0 ? getHRZone(liveHR, profile.age) : 'rest'
  const hrZoneColor = HR_ZONE_COLOR[hrZone]
  const hrZoneLabel = isHebrew ? HR_ZONE_LABEL[hrZone].he : HR_ZONE_LABEL[hrZone].en

  return (
    <div className="workout-active-layout">
      {showSkip && (
        <SkipConfirm onConfirm={handleSkipConfirm} onCancel={() => setShowSkip(false)} />
      )}

      {liveHR > 0 && (
        <div className="hr-workout-badge" style={{ borderColor: hrZoneColor, color: hrZoneColor }}>
          <span className="hr-workout-icon">❤️</span>
          <span className="hr-workout-bpm">{liveHR}</span>
          <span className="hr-workout-zone">{hrZoneLabel}</span>
        </div>
      )}

      {(hrZone === 'peak' || hrZone === 'max') && liveHR > 0 && (
        <div className={`hr-warning-banner hr-warning-${hrZone}`}>
          {hrZone === 'max'
            ? (isHebrew ? '⚠️ דופק גבוה מאוד! שקול להאט או לעצור' : '⚠️ Very high heart rate! Consider slowing down')
            : (isHebrew ? '🔥 דופק גבוה — אתה בזון שיא' : '🔥 High heart rate — you\'re in peak zone')}
        </div>
      )}

      <div className="workout-progress-bar-wrap">
        <div
          className="workout-progress-bar-fill"
          style={{ width: `${total > 0 ? (exIndex / total) * 100 : 0}%` }}
        />
      </div>

      <p className="exercise-counter">{t('exercise')} {exIndex + 1} {t('of')} {total}</p>

      <div className="exercise-focus-card">
        <ExerciseAnimation exerciseName={currentEx.name} isActive={true} />
        <h2 className="exercise-focus-name">{isHebrew ? currentEx.nameHe : currentEx.name}</h2>
        <p className="exercise-focus-sets">
          {t('set')} {setIndex + 1} {t('of')} {currentEx.sets}
          {' — '}
          {currentEx.reps} {t('reps')}
          {currentEx.durationSeconds ? ` · ⏱ ${currentEx.durationSeconds}s` : ''}
          {' · 😴 '}{currentEx.restSeconds}s
        </p>
        <p className="age-note compact">
          <strong>{t('ageAdaptation')}: {t(ageGuidance.group)}</strong>
          <span>{t('ageWorkoutNote')}</span>
        </p>
        <p className="exercise-focus-instruction">{isHebrew ? currentEx.instructionHe : currentEx.instruction}</p>
        <ExerciseCoachingDetailsView
          compact={selectedWorkout.durationMinutes <= 20}
          exercise={currentEx}
        />
      </div>

      {lastFeedback ? (
        <div className="set-feedback-msg">{lastFeedback}</div>
      ) : currentEx.durationSeconds ? (
        <TimedExerciseTimer
          key={`${currentEx.id}-${setIndex}`}
          seconds={currentEx.durationSeconds}
          onComplete={() => handleSetDone(t('good'))}
        />
      ) : (
        <div className="set-done-wrap">
          <button className="btn-set-done" onClick={handleSetFinished}>
            {isHebrew ? '✓ סיימתי' : '✓ Done'}
          </button>
        </div>
      )}

      <button className="btn-skip" onClick={() => setShowSkip(true)}>{t('skipExercise')}</button>
    </div>
  )
}
