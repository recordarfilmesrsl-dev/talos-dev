"use client"

import * as React from "react"
import { Menu } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"
import { ChevronRightIcon } from "lucide-react"

const DropdownMenu = Menu.Root

const DropdownMenuTrigger = Menu.Trigger

const DropdownMenuGroup = Menu.Group

const DropdownMenuPortal = Menu.Portal

const DropdownMenuRadioGroup = Menu.RadioGroup

const DropdownMenuSub = Menu.SubmenuRoot

function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: Menu.SubmenuTrigger.Props) {
  return (
    <Menu.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        "flex cursor-default items-center rounded-md px-2.5 py-2 text-sm outline-none select-none focus:bg-zinc-900 focus:text-zinc-50 hover:bg-zinc-900/60 hover:text-zinc-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 [&_svg]:mr-2.5",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4 text-zinc-500" />
    </Menu.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: Menu.Popup.Props) {
  return (
    <Menu.Portal>
      <Menu.Positioner className="isolate z-50">
        <Menu.Popup
          data-slot="dropdown-menu-sub-content"
          className={cn(
            "z-50 min-w-[8rem] overflow-hidden rounded-md border border-zinc-900 bg-zinc-950 p-1 text-white shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "end",
  ...props
}: Menu.Popup.Props & Pick<Menu.Positioner.Props, "side" | "sideOffset" | "align" | "alignOffset">) {
  return (
    <Menu.Portal>
      <Menu.Positioner sideOffset={sideOffset} align={align} className="isolate z-50">
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 min-w-56 overflow-hidden rounded-xl border border-zinc-900 bg-zinc-950 p-1.5 text-white shadow-xl ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function DropdownMenuItem({
  className,
  ...props
}: Menu.Item.Props) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:bg-zinc-900 focus:text-zinc-50 hover:bg-zinc-900/60 hover:text-zinc-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4.5 [&_svg]:mr-2.5 [&_svg]:text-zinc-500 [&_svg]:transition-colors focus:[&_svg]:text-zinc-300 hover:[&_svg]:text-zinc-300",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: Menu.CheckboxItem.Props) {
  return (
    <Menu.CheckboxItem
      className={cn(
        "relative flex cursor-default select-none items-center rounded-lg py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:bg-zinc-900 focus:text-zinc-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
        <Menu.CheckboxItemIndicator>
          <svg
            className="size-3.5 fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </Menu.CheckboxItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: Menu.RadioItem.Props) {
  return (
    <Menu.RadioItem
      className={cn(
        "relative flex cursor-default select-none items-center rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:bg-zinc-900 focus:text-zinc-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
        <Menu.RadioItemIndicator>
          <span className="size-2 rounded-full bg-white" />
        </Menu.RadioItemIndicator>
      </span>
      {children}
    </Menu.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest", className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: Menu.Separator.Props) {
  return (
    <Menu.Separator
      className={cn("-mx-1.5 my-1.5 h-px bg-zinc-900", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuPortal,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
