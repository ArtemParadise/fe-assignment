const MAX_ARTICLES = 3;
const SUMMARY_LENGTH = 80;

// `news` is the only state: absent while in flight, empty once it settled with
// nothing to show (or failed), populated when there are articles.
function StockNews({ news }) {
  if (!news) {
    return <p>Loading news...</p>;
  }

  if (news.length === 0) {
    return <p>No news available.</p>;
  }

  return (
    <ul>
      {news.slice(0, MAX_ARTICLES).map((article) => (
        <li key={article.id}>
          <strong>{article.title}</strong>
          <small>{article.date}</small>
          <p>{article.summary.substring(0, SUMMARY_LENGTH)}...</p>
        </li>
      ))}
    </ul>
  );
}

export default StockNews;
