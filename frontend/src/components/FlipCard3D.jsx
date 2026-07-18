import React, { forwardRef, useRef, useImperativeHandle } from 'react'
import { CardPreviewIframe } from './CardPreviewIframe'

/**
 * FlipCard3D — Unified Card Renderer
 * Uses CardPreviewIframe internally to guarantee identical rendering 
 * between the User App and the Admin Panel.
 */
export const FlipCard3D = forwardRef(function FlipCard3D(
  { cardData, backUrl, width = 320, autoFlip = false, showActions = true, onCardClick = null, showDownloadIcon = false },
  ref
) {
  const cardRef = useRef(null)

  useImperativeHandle(ref, () => ({
    flip: () => {},
    download: () => cardRef.current?.download(),
  }))

  return (
    <CardPreviewIframe
      ref={cardRef}
      cardData={cardData}
      width={width}
      showDownloadIcon={showDownloadIcon}
      onCardClick={onCardClick}
    />
  )
})
