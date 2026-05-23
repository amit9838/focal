import React from 'react'

interface CanvasCOntainerProps {
    canvasRef: React.RefObject<HTMLCanvasElement>
}
const CanvasContainer: React.FC<CanvasCOntainerProps> = ({ canvasRef }) => {
    return (
        <div className='w-full h-full flex justify-center items-center'>
            <canvas ref={canvasRef} className='absolute top-0 left-0 w-full h-full pointer-events-none'></canvas>
        </div>
    )
}