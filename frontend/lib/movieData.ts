export type Movie = {
  id: number;
  title: string;
  titleEn: string;
  genre: string;
  hours: number;
  minutes: number;
  rating: string;
  screen: string;
  schedule: string;
  imageSrc: string;
  imageAlt: string;
  synopsis: string;
};

export const MOVIES: Movie[] = [
  {
    id: 1,
    title: "スパイダーマン：ノー・ウェイ・ホーム",
    titleEn: "SPIDER-MAN: NO WAY HOME",
    genre: "アクション",
    hours: 2,
    minutes: 28,
    rating: "PG12",
    screen: "Screen 01",
    schedule: "21:10",
    imageSrc: "/images/man.jpg",
    imageAlt: "スパイダーマン ポスター",
    synopsis:
      "ピーター・パーカーの正体が暴かれ、日常が一変。ドクター・ストレンジに頼み込んで記憶を消す魔法を試みるが、呪文が暴走し、マルチバースが開いてしまう。別の世界から現れた宿敵たちとの壮絶な戦いが幕を開ける。",
  },
  {
    id: 2,
    title: "ゴジラ -1.0",
    titleEn: "GODZILLA MINUS ONE",
    genre: "モンスター",
    hours: 2,
    minutes: 5,
    rating: "PG12",
    screen: "Screen 02",
    schedule: "18:30",
    imageSrc: "/images/gozira.jpg",
    imageAlt: "ゴジラ -1.0 ポスター",
    synopsis:
      "戦後の焼け野原と化した日本に、さらなる脅威が迫る。傷ついた国と人々が、史上最悪の絶望に立ち向かう姿を描いた、シリーズ史上最もドラマティックなゴジラ映画。",
  },
  {
    id: 3,
    title: "ハリー・ポッターと賢者の石",
    titleEn: "HARRY POTTER",
    genre: "ファンタジー",
    hours: 2,
    minutes: 32,
    rating: "G",
    screen: "Screen 03",
    schedule: "20:00",
    imageSrc: "/images/harry.jpg",
    imageAlt: "ハリー・ポッター ポスター",
    synopsis:
      "孤児として育ったハリーは11歳の誕生日に魔法使いであることを知り、ホグワーツ魔法魔術学校へ入学する。友情と冒険に満ちた魔法世界の物語が始まる。",
  },
  {
    id: 4,
    title: "ダークナイト",
    titleEn: "THE DARK KNIGHT",
    genre: "アクション",
    hours: 2,
    minutes: 32,
    rating: "PG12",
    screen: "Screen 01",
    schedule: "22:15",
    imageSrc: "/images/dark.webp",
    imageAlt: "ダークナイト ポスター",
    synopsis:
      "ゴッサム・シティを守るバットマンの前に、混沌を愛する犯罪者ジョーカーが現れる。善と悪の境界線を問い続ける、超人気ヒーロー映画の金字塔。",
  },
  {
    id: 5,
    title: "インターステラー",
    titleEn: "INTERSTELLAR",
    genre: "SF",
    hours: 2,
    minutes: 49,
    rating: "PG12",
    screen: "Screen 04",
    schedule: "19:00",
    imageSrc: "/images/inter.webp",
    imageAlt: "インターステラー ポスター",
    synopsis:
      "食糧危機に瀕した地球を救うため、元宇宙飛行士の父は家族を残して宇宙へ旅立つ。ワームホールを越えた先で待ち受ける時間と空間の謎に迫るSF大作。",
  },
  {
    id: 6,
    title: "ウィッチ",
    titleEn: "THE WITCH",
    genre: "ホラー",
    hours: 1,
    minutes: 32,
    rating: "18+",
    screen: "Screen 05",
    schedule: "23:30",
    imageSrc: "/images/which.jpg",
    imageAlt: "ウィッチ ポスター",
    synopsis:
      "17世紀のニューイングランド。村から追放された敬虔なキリスト教徒の一家が森の外れに移り住む。やがて幼い息子が神隠しに遭い、家族の間に疑念と恐怖が広がり始める。",
  },
  {
    id: 7,
    title: "アベンジャーズ：エンドゲーム",
    titleEn: "AVENGERS: ENDGAME",
    genre: "アクション",
    hours: 3,
    minutes: 1,
    rating: "PG12",
    screen: "Screen 02",
    schedule: "17:45",
    imageSrc: "/images/avenja-z.jpg",
    imageAlt: "アベンジャーズ ポスター",
    synopsis:
      "サノスに半数の命を消された宇宙。生き残ったヒーローたちが最後の賭けに挑む。10年以上にわたるMCUの集大成となる超大作クライマックス。",
  },
  {
    id: 8,
    title: "君の名は。",
    titleEn: "YOUR NAME",
    genre: "アニメ",
    hours: 1,
    minutes: 46,
    rating: "G",
    screen: "Screen 03",
    schedule: "14:00",
    imageSrc: "/images/kiminonawa.jpg",
    imageAlt: "君の名は。ポスター",
    synopsis:
      "東京に住む男子高校生・瀧と、田舎町に住む女子高校生・三葉が、夢の中で入れ替わる不思議な体験を繰り返す。やがて二人は互いの存在を意識し始めるが…。",
  },
  {
    id: 9,
    title: "パラサイト 半地下の家族",
    titleEn: "PARASITE",
    genre: "スリラー",
    hours: 2,
    minutes: 12,
    rating: "18+",
    screen: "Screen 05",
    schedule: "20:30",
    imageSrc: "/images/para.jpg",
    imageAlt: "パラサイト ポスター",
    synopsis:
      "全員無職のキム一家が、IT企業経営者のパク家に家庭教師や運転手として潜り込む。格差社会の闇を鋭く描いたアカデミー賞作品賞受賞の傑作スリラー。",
  },
  {
    id: 10,
    title: "ラ・ラ・ランド",
    titleEn: "LA LA LAND",
    genre: "ミュージカル",
    hours: 2,
    minutes: 8,
    rating: "G",
    screen: "Screen 03",
    schedule: "16:15",
    imageSrc: "/images/land.jpg",
    imageAlt: "ラ・ラ・ランド ポスター",
    synopsis:
      "夢を追うジャズピアニストの男と女優志望の女が、ロサンゼルスで出会い恋に落ちる。夢と愛の間で揺れる二人を描いた、アカデミー賞6部門受賞のミュージカル映画。",
  },
  {
    id: 11,
    title: "トップガン：マーヴェリック",
    titleEn: "TOP GUN: MAVERICK",
    genre: "アクション",
    hours: 2,
    minutes: 11,
    rating: "PG12",
    screen: "Screen 01",
    schedule: "19:30",
    imageSrc: "/images/topgun.jpg",
    imageAlt: "トップガン：マーヴェリック ポスター",
    synopsis:
      "伝説のパイロット・マーヴェリックが、トップガンのエリート教官として帰還。不可能とされるミッションに挑む教え子たちと共に、空の限界へ挑戦する。",
  },
  {
    id: 12,
    title: "エブリシング・エブリウェア・オール・アット・ワンス",
    titleEn: "EVERYTHING EVERYWHERE",
    genre: "SF",
    hours: 2,
    minutes: 19,
    rating: "18+",
    screen: "Screen 04",
    schedule: "21:45",
    imageSrc: "/images/every.jpg",
    imageAlt: "エブリシング・エブリウェア ポスター",
    synopsis:
      "コインランドリーを営む中年女性・エブリンが、マルチバースを股にかけた壮大な冒険に巻き込まれる。アカデミー賞作品賞ほか7部門を制覇した衝撃のSF映画。",
  },
];

export function getMovieById(id: number): Movie | undefined {
  return MOVIES.find((m) => m.id === id);
}
