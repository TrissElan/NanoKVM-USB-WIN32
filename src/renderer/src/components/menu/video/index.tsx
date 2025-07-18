import { ReactElement } from 'react'
import { Popover } from 'antd'
import { MonitorIcon } from 'lucide-react'

import { Device } from './device'
import { FPS } from './fps'
import { Resolution } from './resolution'

export const Video = (): ReactElement => {
  const content = (
    <div className="flex flex-col space-y-1">
      <Resolution />
      <FPS />
      <Device />
    </div>
  )

  return (
    <Popover content={content} placement="bottomLeft" trigger="click" arrow={false}>
      <div className="flex h-[28px] cursor-pointer items-center justify-center rounded px-2 text-white hover:bg-neutral-700/70">
        <MonitorIcon size={18} />
      </div>
    </Popover>
  )
}
