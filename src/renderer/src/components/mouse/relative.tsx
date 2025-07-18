import { ReactElement, useEffect, useRef } from 'react'
import { message } from 'antd'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'

import { IpcEvents } from '@common/ipc-events'
import { resolutionAtom } from '@renderer/jotai/device'
import { scrollDirectionAtom, scrollIntervalAtom } from '@renderer/jotai/mouse'
import type { Mouse as MouseKey } from '@renderer/types'

export const Relative = (): ReactElement => {
  const { t } = useTranslation()
  const [messageApi, contextHolder] = message.useMessage()

  const resolution = useAtomValue(resolutionAtom)
  const scrollDirection = useAtomValue(scrollDirectionAtom)
  const scrollInterval = useAtomValue(scrollIntervalAtom)

  const isLockedRef = useRef(false)
  const keyRef = useRef<MouseKey>({
    left: false,
    right: false,
    mid: false
  })
  const lastScrollTimeRef = useRef(0)

  useEffect(() => {
    messageApi.open({
      key: 'relative',
      type: 'info',
      content: t('mouse.requestPointer'),
      duration: 3,
      style: {
        marginTop: '40vh'
      }
    })
  }, [])

  useEffect(() => {
    const canvas = document.getElementById('video')
    if (!canvas) return

    document.addEventListener('pointerlockchange', handlePointerLockChange)
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('wheel', handleWheel)
    canvas.addEventListener('contextmenu', disableEvent)

    function handlePointerLockChange(): void {
      isLockedRef.current = document.pointerLockElement === canvas
    }

    function handleClick(event: MouseEvent): void {
      disableEvent(event)

      if (!isLockedRef.current) {
        canvas!.requestPointerLock()
      }
    }

    async function handleMouseDown(event: MouseEvent): Promise<void> {
      disableEvent(event)

      switch (event.button) {
        case 0:
          keyRef.current.left = true
          break
        case 1:
          keyRef.current.mid = true
          break
        case 2:
          keyRef.current.right = true
          break
        default:
          return
      }

      await send(0, 0, 0)
    }

    async function handleMouseUp(event: MouseEvent): Promise<void> {
      disableEvent(event)

      switch (event.button) {
        case 0:
          keyRef.current.left = false
          break
        case 1:
          keyRef.current.mid = false
          break
        case 2:
          keyRef.current.right = false
          break
        default:
          return
      }

      await send(0, 0, 0)
    }

    async function handleMouseMove(event: MouseEvent): Promise<void> {
      disableEvent(event)

      const x = event.movementX || 0
      const y = event.movementY || 0
      if (x === 0 && y === 0) return

      // 더블 모니터 환경에서 안정적인 마우스 감도 조정
      const adjustedX = Math.max(-127, Math.min(127, x))
      const adjustedY = Math.max(-127, Math.min(127, y))

      await send(adjustedX, adjustedY, 0)
    }

    async function handleWheel(event: WheelEvent): Promise<void> {
      disableEvent(event)

      const currentTime = Date.now()
      if (currentTime - lastScrollTimeRef.current < scrollInterval) {
        return
      }

      const delta = Math.floor(event.deltaY)
      if (delta === 0) return

      await send(0, 0, delta > 0 ? -1 * scrollDirection : scrollDirection)

      lastScrollTimeRef.current = currentTime
    }

    async function send(x: number, y: number, scroll: number): Promise<void> {
      const key =
        (keyRef.current.left ? 1 : 0) |
        (keyRef.current.right ? 2 : 0) |
        (keyRef.current.mid ? 4 : 0)

      await window.electron.ipcRenderer.invoke(IpcEvents.SEND_MOUSE_RELATIVE, key, x, y, scroll)
    }

    return (): void => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('contextmenu', disableEvent)
    }
  }, [resolution, scrollDirection, scrollInterval])

  function disableEvent(event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
  }

  return <>{contextHolder}</>
}
