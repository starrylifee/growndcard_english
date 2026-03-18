const BASE_URL = 'https://growndcard.com'

interface AwardPointsParams {
  classId: string
  studentCode: number
  apiKey: string
  type: 'reward' | 'penalty'
  points: number
  description: string
}

interface StudentInfoResponse {
  success: boolean
  data?: {
    studentId: string
    studentCode: number
    studentName: string
    avatar?: string
    points?: {
      totalPoints: number
      currentLevel: number
      levelName: string
    }
  }
  error?: { code: string; message: string }
}

interface AwardPointsResponse {
  success: boolean
  data?: {
    recordId: string
    studentCode: number
    pointsAwarded: number
    totalPoints: number
    currentLevel: number
    leveledUp: boolean
  }
  error?: { code: string; message: string }
}

export async function fetchStudentInfo(
  classId: string,
  studentCode: number,
  apiKey: string
): Promise<StudentInfoResponse> {
  const url = `${BASE_URL}/api/v1/classes/${classId}/students/${studentCode}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'X-API-Key': apiKey },
  })
  return response.json()
}

export async function awardPoints(params: AwardPointsParams): Promise<AwardPointsResponse> {
  const { classId, studentCode, apiKey, type, points, description } = params
  const url = `${BASE_URL}/api/v1/classes/${classId}/students/${studentCode}/points`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ type, points, description, source: 'EnglishQuizTool' }),
  })
  return response.json()
}

export async function fetchAllStudents(
  classId: string,
  apiKey: string,
  startCode: number,
  endCode: number,
  onProgress?: (current: number, total: number) => void
) {
  const students: StudentInfoResponse['data'][] = []
  const total = endCode - startCode + 1

  for (let code = startCode; code <= endCode; code++) {
    try {
      const result = await fetchStudentInfo(classId, code, apiKey)
      if (result.success && result.data) {
        students.push(result.data)
      }
    } catch {
      // skip failed student
    }
    onProgress?.(code - startCode + 1, total)
    if (code < endCode) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  return students
}
