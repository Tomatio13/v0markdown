declare module 'xterm' {
  export interface ITerminalOptions {
    theme?: {
      background?: string
      foreground?: string
      cursor?: string
      selection?: string
      black?: string
      red?: string
      green?: string
      yellow?: string
      blue?: string
      magenta?: string
      cyan?: string
      white?: string
      brightBlack?: string
      brightRed?: string
      brightGreen?: string
      brightYellow?: string
      brightBlue?: string
      brightMagenta?: string
      brightCyan?: string
      brightWhite?: string
    }
    fontFamily?: string
    fontSize?: number
    lineHeight?: number
    cursorBlink?: boolean
    cursorStyle?: 'bar' | 'block' | 'underline'
    scrollback?: number
    tabStopWidth?: number
  }

  export interface IDisposable {
    dispose(): void
  }

  export class Terminal {
    constructor(options?: ITerminalOptions)
    open(element: HTMLElement): void
    write(data: string): void
    writeln(data: string): void
    clear(): void
    focus(): void
    dispose(): void
    onData(callback: (data: string) => void): IDisposable
    onKey(callback: (event: { key: string; domEvent: KeyboardEvent }) => void): IDisposable
    resize(cols: number, rows: number): void
    loadAddon(addon: any): void
    cols: number
    rows: number
  }
}

declare module '@xterm/addon-fit' {
  export class FitAddon {
    fit(): void
    proposeDimensions(): { cols: number; rows: number } | undefined
  }
}

declare module '@xterm/addon-web-links' {
  export class WebLinksAddon {
    constructor()
  }
}