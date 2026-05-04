export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  restSeconds: number
  instruction: string
}

export interface Workout {
  id: string
  name: string
  durationMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  type: 'strength' | 'cardio' | 'hiit' | 'flexibility'
  targetMuscles: string[]
  exercises: Exercise[]
}

export const mockWorkouts: Workout[] = [
  {
    id: 'w1',
    name: 'Full Body Strength',
    durationMinutes: 40,
    difficulty: 'medium',
    type: 'strength',
    targetMuscles: ['chest', 'back', 'legs', 'core'],
    exercises: [
      { id: 'e1', name: 'Squats', sets: 3, reps: 12, restSeconds: 60, instruction: 'Stand with feet shoulder-width apart. Lower your body until thighs are parallel to the floor, then push back up.' },
      { id: 'e2', name: 'Push-Ups', sets: 3, reps: 10, restSeconds: 45, instruction: 'Start in plank position. Lower your chest to the floor, keeping elbows at 45°. Push back up to start.' },
      { id: 'e3', name: 'Dumbbell Rows', sets: 3, reps: 12, restSeconds: 60, instruction: 'Hinge at hips, pull dumbbell to your hip. Keep back flat and core tight throughout.' },
      { id: 'e4', name: 'Plank', sets: 3, reps: 30, restSeconds: 30, instruction: 'Hold a straight line from head to heels. Engage your core, glutes, and keep breathing steadily.' },
      { id: 'e5', name: 'Lunges', sets: 3, reps: 10, restSeconds: 45, instruction: 'Step forward and lower your back knee toward the floor. Keep front knee over ankle. Alternate legs.' },
    ],
  },
  {
    id: 'w2',
    name: 'HIIT Cardio Blast',
    durationMinutes: 25,
    difficulty: 'hard',
    type: 'hiit',
    targetMuscles: ['full body', 'cardio'],
    exercises: [
      { id: 'e6', name: 'Burpees', sets: 4, reps: 10, restSeconds: 30, instruction: 'Drop to a squat, kick feet back into plank, do a push-up, jump feet forward, then jump up explosively.' },
      { id: 'e7', name: 'Mountain Climbers', sets: 4, reps: 20, restSeconds: 20, instruction: 'From plank, drive knees toward chest alternately as fast as you can while keeping hips level.' },
      { id: 'e8', name: 'Jump Squats', sets: 4, reps: 12, restSeconds: 30, instruction: 'Perform a squat then explode upward into a jump. Land softly and immediately go into the next rep.' },
      { id: 'e9', name: 'High Knees', sets: 4, reps: 30, restSeconds: 20, instruction: 'Run in place, driving knees up to hip height. Pump arms and keep a fast pace.' },
    ],
  },
  {
    id: 'w3',
    name: 'Morning Flexibility',
    durationMinutes: 20,
    difficulty: 'easy',
    type: 'flexibility',
    targetMuscles: ['full body', 'mobility'],
    exercises: [
      { id: 'e10', name: 'Cat-Cow Stretch', sets: 2, reps: 10, restSeconds: 15, instruction: 'On hands and knees, alternate between arching your back up (cat) and letting it sag (cow). Breathe slowly.' },
      { id: 'e11', name: 'Hip Flexor Stretch', sets: 2, reps: 30, restSeconds: 15, instruction: 'Kneel on one knee, push hips forward gently until you feel a stretch in the front of the hip. Hold 30 seconds each side.' },
      { id: 'e12', name: 'Hamstring Stretch', sets: 2, reps: 30, restSeconds: 15, instruction: 'Sit with legs extended. Reach toward your toes while keeping your back as straight as possible.' },
      { id: 'e13', name: 'Shoulder Rolls', sets: 2, reps: 10, restSeconds: 10, instruction: 'Roll shoulders forward 10 times, then backward 10 times. Keep neck relaxed.' },
    ],
  },
]

export const todayWorkout = mockWorkouts[0]
