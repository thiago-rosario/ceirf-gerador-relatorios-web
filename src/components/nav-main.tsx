import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { NavigationId, NavigationItem } from '@/components/layout/navigation'

export function NavMain({
  items,
  activeItem,
  onNavigate,
}: {
  items: readonly NavigationItem[]
  activeItem: NavigationId
  onNavigate: (href: NavigationItem['href']) => void
}) {
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={item.id === activeItem}
                size="lg"
                className="gap-3 px-3 group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:p-3! [&_svg]:size-5"
                tooltip={item.title}
                aria-label={item.title}
                render={<a href={item.href} aria-current={item.id === activeItem ? 'page' : undefined} />}
                onClick={(event) => {
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                  event.preventDefault()
                  setOpenMobile(false)
                  onNavigate(item.href)
                }}
              >
                <item.icon aria-hidden="true" />
                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
