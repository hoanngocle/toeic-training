export default function LogoutButton() {
  return <form action="/api/auth/logout" method="post"><button className="theme-toggle" type="submit">Đăng xuất</button></form>;
}
