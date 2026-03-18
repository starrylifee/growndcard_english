import { useRef, useEffect, useState, useCallback } from 'react'

interface HandwritingCanvasProps {
  onSubmit: (imageBase64: string) => void
  disabled?: boolean
}

export function HandwritingCanvas({ onSubmit, disabled }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#1E293B'
  }, [])

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    setHasStrokes(true)
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || disabled) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const endDraw = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, rect.width / dpr * dpr, rect.height / dpr * dpr)
    ctx.fillRect(0, 0, rect.width, rect.height)
    setHasStrokes(false)
  }

  const handleSubmit = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) return
    const base64 = canvas.toDataURL('image/png')
    onSubmit(base64)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height: '200px' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        <div className="absolute bottom-2 left-2 text-xs text-gray-300 pointer-events-none">
          여기에 영어 단어를 쓰세요
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={clearCanvas}
          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors active:scale-95"
        >
          지우기
        </button>
        <button
          onClick={handleSubmit}
          disabled={!hasStrokes || disabled}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          제출
        </button>
      </div>
    </div>
  )
}
