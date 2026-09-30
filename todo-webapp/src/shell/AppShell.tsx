// The signed-in app shell — the sample app's AppLayout (Oxygen UI's
// `sample/src/layouts/AppLayout.tsx`), adjusted per oxygen-ui-design-system's
// "Implementing a wireframe with Oxygen" table for wireframes.dsl's
// `navbar "Todo"`. Navigation lives in the sidebar even though this app has a
// single screen — the shell is not negotiable (oxygen-ui-design-system).

import {
  AppShell,
  ColorSchemeToggle,
  Divider,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import { CheckSquare, LogOut } from "@wso2/oxygen-ui-icons-react";
import type { JSX } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuthz } from "../authz/gates";
import { signOut } from "../authz/session";
import { APP_NAME } from "../appName";

export function AppShellLayout(): JSX.Element {
  const { username } = useAuthz();
  // Only one screen exists, so it is always the active rail item.
  const active = "todolist";

  return (
    <AppShell>
      <AppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Signed in"} />
              <UserMenu.Header name={username || "Signed in"} email={username} />
              <UserMenu.Logout icon={<LogOut size={18} />} onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </AppShell.Navbar>

      <AppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              <Sidebar.Item id="todolist" link={<Link to="/todos" />}>
                <Sidebar.ItemIcon>
                  <CheckSquare size={18} />
                </Sidebar.ItemIcon>
                <Sidebar.ItemLabel>My Todos</Sidebar.ItemLabel>
              </Sidebar.Item>
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </AppShell.Sidebar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </AppShell.Footer>
    </AppShell>
  );
}
