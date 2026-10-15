import { useCallback, useRef, useState } from 'react'

export default function ImageUploader({ onSelect, onSample, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (files) => {
      const file = files && files[0]
      if (!file) return
      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file (JPG, PNG, WebP, BMP).')
        return
      }
      onSelect(file)
    },
    [onSelect],
  )

  return (
    <div
      className={`uploader${dragging ? ' uploader--dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="uploader__icon">🔍</div>
      <p className="uploader__title">Drop an image here</p>
      <p className="uploader__subtitle">or click to browse — JPG, PNG, WebP, BMP</p>
      <button
        type="button"
        className="uploader__sample"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          onSample()
        }}
      >
        Try a sample image
      </button>
    </div>
  )
}
