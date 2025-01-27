import React, { useState } from 'react';
import { Layout, Menu, Breadcrumb, Typography, Row, Col } from 'antd';
import Link from 'next/link';
import { withRouter, NextRouter } from 'next/router';
import { WithRouterProps } from 'next/dist/client/with-router';

import Icon, {
  TeamOutlined,
  DashboardOutlined,
  DotChartOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { SubMenu, Item } = Menu;
const { Sider, Content } = Layout;

interface Router extends NextRouter {
  path: string;
  breadcrumbName: string;
}

interface Props extends WithRouterProps {
  router: Router;
}

function itemRender(route: Router) {
  return route.path === 'index' ? (
    <Link href={'/'}>
      <a>{route.breadcrumbName}</a>
    </Link>
  ) : (
    <span>{route.breadcrumbName}</span>
  );
}

function routesMaker(pathsplit: string[]) {
  const routes = [
    {
      path: 'index',
      breadcrumbName: 'home',
    },
  ];
  for (const v of pathsplit) {
    const pathInfo = {
      path: v,
      breadcrumbName: v,
    };
    if (v !== '') routes.push(pathInfo);
  }
  return routes;
}

const AppLayout = (props: React.PropsWithChildren<Props>) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const onChangeIsCollapsed = (isCollapsed: boolean) => {
    setIsCollapsed(isCollapsed);
  };

  const pathname = props.router.pathname;
  const pathsplit: string[] = pathname.split('/');
  const routes = routesMaker(pathsplit);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
        }}
        collapsed={isCollapsed}
        onCollapse={onChangeIsCollapsed}
      >
        <Link href="/disputes">
          <a>
            <div
              style={{
                display: 'flex',
                height: '30px',
                margin: '30px',
                justifyContent: 'center',
                justifyItems: 'center',
              }}
            >
              <Row wrap={false} align="middle" gutter={5}>
                <Col flex={1}>
                  <svg
                    width="22px"
                    height="28px"
                    viewBox="0 0 22 28"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <title>Fill 19</title>
                    <desc>Created with Sketch.</desc>
                    <g
                      id="Symbols"
                      stroke="none"
                      strokeWidth="1"
                      fill="none"
                      fillRule="evenodd"
                    >
                      <g
                        id="Menu-/-not-signed-in"
                        transform="translate(-88.000000, -52.000000)"
                        fill="#FFFFFF"
                      >
                        <path
                          d="M97.3333019,67.5555032 C93.8969498,67.5555032 91.1111006,64.7698425 91.1111006,61.3333019 C91.1111006,57.8967613 93.8969498,55.1111006 97.3333019,55.1111006 C100.769843,55.1111006 103.555503,57.8967613 103.555503,61.3333019 C103.555503,64.7698425 100.769843,67.5555032 97.3333019,67.5555032 M97.3333019,52 C102.487924,52 106.666604,56.1786795 106.666604,61.3333019 C106.666604,66.4879243 102.487924,70.6666038 97.3333019,70.6666038 C92.1786795,70.6666038 88,66.4879243 88,61.3333019 C88,56.1786795 92.1786795,52 97.3333019,52 Z M106.211063,71.1221444 C106.818576,71.7296575 106.818576,72.7144622 106.211063,73.3219753 L99.9886734,79.5443652 C99.3811603,80.1518783 98.3963556,80.1518783 97.7888425,79.5443652 C97.1813294,78.9368521 97.1813294,77.9520473 97.7888425,77.3445342 L104.011232,71.1221444 C104.618745,70.5146313 105.60355,70.5146313 106.211063,71.1221444 Z M109.777704,53.5555503 C109.777704,54.4147797 109.081384,55.1111006 108.222343,55.1111006 C107.363113,55.1111006 106.666792,54.4147797 106.666792,53.5555503 C106.666792,52.6963209 107.363113,52 108.222343,52 C109.081384,52 109.777704,52.6963209 109.777704,53.5555503 Z"
                          id="Fill-19"
                        ></path>
                      </g>
                    </g>
                  </svg>
                </Col>
                <Col flex={2}>
                  <Text style={{ color: 'white', fontSize: '1.5em' }}>
                    Portal
                  </Text>
                </Col>
              </Row>
            </div>
          </a>
        </Link>
        <Menu
          theme="dark"
          defaultSelectedKeys={['/menu1']}
          selectedKeys={[pathsplit.pop()]}
          defaultOpenKeys={[pathsplit[1]]}
          mode="inline"
        >
          <Item key="disputes" icon={<TeamOutlined />}>
            <Link href="/disputes">
              <a>Disputes</a>
            </Link>
          </Item>
          <Item key="analysis" icon={<DashboardOutlined />}>
            <Link href="/analysis">
              <a>Analysis</a>
            </Link>
          </Item>
          <SubMenu
            key="dashboard"
            icon={<DotChartOutlined />}
            title="Dashboards"
          >
            <Item key="events">
              <Link href="/dashboard/events">
                <a>Events</a>
              </Link>
            </Item>
            <Item key="clients">
              <Link href="/dashboard/clients">
                <a>Clients</a>
              </Link>
            </Item>
          </SubMenu>
        </Menu>
      </Sider>
      <Layout style={{ marginLeft: 200, padding: '0 16px 16px' }}>
        <Breadcrumb
          style={{ margin: '16px 0' }}
          itemRender={itemRender}
          routes={routes}
        />
        <Content
          className="site-layout-background"
          style={{
            padding: 6,
            minHeight: 280,
            backgroundColor: '#ffffff',
            overflow: 'initial',
          }}
        >
          {props.children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default withRouter(AppLayout);
