import { useRef, useEffect, useState, useCallback } from 'react'

interface HandwritingCanvasProps {
  onSubmit: (imageBase64: string) => void
  disabled?: boolean
}

type ToolMode = 'pen' | 'eraser'

export function HandwritingCanvas({ onSubmit, disabled }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [tool, setTool] = useState<ToolMode>('pen')

  const PEN_WIDTH = 3
  const ERASER_WIDTH = 24

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  const drawGuideLines = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save()
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    const lineSpacing = 40
    for (let y = lineSpacing; y < h; y += lineSpacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    ctx.setLineDash([])
    ctx.restore()
  }, [])

  const initCanvas = useCallback(() => {
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

    drawGuideLines(ctx, rect.width, rect.height)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [drawGuideLines])

  useEffect(() => {
    initCanvas()
  }, [initCanvas])

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

  const applyToolStyle = (ctx: CanvasRenderingContext2D) => {
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = ERASER_WIDTH
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = '#1E293B'
      ctx.lineWidth = PEN_WIDTH
    }
  }

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    applyToolStyle(ctx)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    if (tool === 'pen') setHasStrokes(true)
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
    const ctx = getCtx()
    if (ctx) {
      ctx.globalCompositeOperation = 'source-over'
    }
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    initCanvas()
    setHasStrokes(false)
    setTool('pen')
  }

  const handleSubmit = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.scale(dpr, dpr)
    tempCtx.fillStyle = '#FFFFFF'
    tempCtx.fillRect(0, 0, rect.width, rect.height)
    tempCtx.setTransform(1, 0, 0, 1, 0, 0)
    tempCtx.drawImage(canvas, 0, 0)

    const base64 = tempCanvas.toDataURL('image/png')
    onSubmit(base64)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setTool('pen')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            tool === 'pen'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="text-base">✏️</span> 펜
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            tool === 'eraser'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="text-base">🧹</span> 지우개
        </button>
        <button
          onClick={clearCanvas}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors ml-auto"
        >
          전체 지우기
        </button>
      </div>

      <div className="relative border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className={`w-full touch-none ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
          style={{ height: '280px' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasStrokes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm">여기에 영어를 쓰세요 (단어 또는 문장)</p>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!hasStrokes || disabled}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      >
        제출
      </button>
    </div>
  )
}
