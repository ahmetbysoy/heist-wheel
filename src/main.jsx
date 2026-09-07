import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Not: StrictMode dev'de effect'leri çift çalıştırır → bahis sayacı iki kez
// ticker ve tur akışı bozulur. Oyun döngüsü tek effect istediği için kapalı.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
