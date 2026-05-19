import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

function App() {
  const movies = [
    { title: "SPIDER MAN : HOME COMING", rate: "9.5", count: "1154" },
    { title: "EVALUTION : LIVE & CONCERT", rate: "7.2", count: "93" },
    { title: "HARRY POTTER", rate: "9.5", count: "2590" },
  ];

  return (
    <div className="page">
      <header className="header">
        <div className="logo">
          HAL
          <br />
          CINEMA
          <br />
          アイコン
        </div>

        <nav className="nav">
          <div className="navItem">
            <div className="icon">⌂</div>
            <p>ホーム</p>
          </div>

          <div className="navItem">
            <div className="icon">🎥</div>
            <p>上映中の作品</p>
          </div>

          <div className="navItem">
            <div className="icon">⌕</div>
            <p>検索</p>
          </div>

          <div className="navItem">
            <div className="icon">◉</div>
            <p>マイページ</p>
          </div>
        </nav>
      </header>

      <div className="searchBox">
        <input type="text" placeholder="Search in Video" />
        <span>⌕</span>
      </div>

      <div className="content">
        <aside className="sideMenu">
          <p>上映スケジュール</p>
          <p>映画一覧</p>
          <p>購入情報確認</p>
          <p>予約状況確認</p>
          <p>キャンペーン情報</p>
        </aside>

        <main className="main">
          <h1>注目映画</h1>

          <button className="arrow left">‹</button>
          <button className="arrow right">›</button>

          <div className="movieList">
            {movies.map((movie, index) => (
              <div className="movieCard" key={index}>
                <div className={`poster poster${index + 1}`}></div>

                <h2>{movie.title}</h2>

                <div className="meta">
                  <span className="star">★</span>
                  <span>{movie.rate}</span>
                  <span>{movie.count}</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
