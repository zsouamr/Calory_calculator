// App.js
import React, { useState } from 'react';
import './App.css';
import Scanner from './components/Scanner';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function App() {
  const [showScanner, setShowScanner] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [productData, setProductData] = useState(null);
  const [calories, setCalories] = useState(0);
  const [macros, setMacros] = useState({ fat: 0, carbs: 0, protein: 0 });
  const [spoonacularResult, setSpoonacularResult] = useState(null);
  const [filterRange, setFilterRange] = useState('all');
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("scanHistory");
    return saved ? JSON.parse(saved) : [];
  });

  const SPOONACULAR_API_KEY = "3lf31daf42384fc3ac3bff954dc987f5";

  const extractQuantityInGrams = (text) => {
    const match = text.match(/(\d+)(g|ml|cl)/i);
    if (!match) return 100;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === "g") return value;
    if (unit === "ml") return value;
    if (unit === "cl") return value * 10;
    return 100;
  };

  const filterHistoryByDate = (range) => {
    const now = new Date();
    return history.filter(item => {
      const date = new Date(item.date);
      if (range === 'today') {
        return date.toDateString() === now.toDateString();
      }
      if (range === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return date >= oneWeekAgo && date <= now;
      }
      return true;
    });
  };

  const filteredHistory = filterHistoryByDate(filterRange);

  const searchSpoonacularFromProductName = async (productName) => {
    try {
      const response = await fetch(
        `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(productName)}&number=1&apiKey=${SPOONACULAR_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setSpoonacularResult(data.results[0]);
      } else {
        setSpoonacularResult(null);
      }
    } catch (err) {
      console.error("Erreur Spoonacular:", err);
    }
  };

  const fetchProductInfo = async (barcode) => {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1) {
        const nutriments = data.product.nutriments;
        const quantityText = data.product.quantity || "100g";
        const quantity = extractQuantityInGrams(quantityText);
        const caloriesPer100g = nutriments['energy-kcal_100g'] || 0;
        const totalCalories = (caloriesPer100g / 100) * quantity;

        setProductData(data.product);
        setCalories(Math.round(totalCalories));
        setMacros({
          fat: nutriments.fat_100g || 0,
          carbs: nutriments.carbohydrates_100g || 0,
          protein: nutriments.proteins_100g || 0
        });

        const newEntry = {
          name: data.product.product_name,
          image: data.product.image_small_url,
          calories: Math.round(totalCalories),
          date: new Date().toISOString()
        };

        const updatedHistory = [newEntry, ...history.slice(0, 9)];
        setHistory(updatedHistory);
        localStorage.setItem("scanHistory", JSON.stringify(updatedHistory));

        searchSpoonacularFromProductName(data.product.product_name);
      } else {
        alert("Produit introuvable !");
      }
    } catch (error) {
      console.error("Erreur API :", error);
    }
  };

  const handleDetected = (code) => {
    setBarcode(code);
    setShowScanner(false);
    fetchProductInfo(code);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("scanHistory");
  };

  const exportAsJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "calory-history.json");
    downloadAnchor.click();
  };

  const exportAsCSV = () => {
    const headers = ["Name", "Calories", "Date"];
    const rows = history.map(item => [item.name, item.calories, item.date]);
    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "calory-history.csv");
    link.click();
  };

  const handleImageSelected = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;

      try {
        const res = await fetch('https://api.example.com/analyze-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });

        const result = await res.json();
        setCalories(result.calories);
        setMacros(result.macros || { fat: 0, carbs: 0, protein: 0 });

        const newEntry = {
          name: result.name || "Photo aliment",
          image: base64Image,
          calories: result.calories,
          date: new Date().toISOString()
        };

        const updatedHistory = [newEntry, ...history.slice(0, 9)];
        setHistory(updatedHistory);
        localStorage.setItem("scanHistory", JSON.stringify(updatedHistory));
      } catch (error) {
        console.error("Erreur analyse image :", error);
        alert("Erreur lors de l'analyse de la photo.");
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="App">
      <h1>Calory Calculator</h1>

      <div className="calory-summary">
        <h2>Calories: {calories}</h2>
        <progress value={calories} max="2000"></progress>
      </div>

      <button className="scan-button" onClick={() => setShowScanner(true)}>Scan</button><br></br>
      <button className="photo-button" onClick={() => document.getElementById('photoInput').click()}>
        📸 Analyser calories depuis une photo
      </button>
      <input type="file" accept="image/*" id="photoInput" style={{ display: 'none' }} onChange={handleImageSelected} />

      {showScanner && (
        <Scanner onDetected={handleDetected} onClose={() => setShowScanner(false)} />
      )}

      <div className="nutrition-info">
        <h3>Nutritions</h3>
        <div className="nutri-item">
          <label>Proteins: {macros.protein}g</label>
          <progress value={macros.protein} max="100"></progress>
        </div>
        <div className="nutri-item">
          <label>Carbs: {macros.carbs}g</label>
          <progress value={macros.carbs} max="100"></progress>
        </div>
        <div className="nutri-item">
          <label>Fats: {macros.fat}g</label>
          <progress value={macros.fat} max="100"></progress>
        </div>
      </div>

      {productData && (
        <div className="product-info">
          <h3>{productData.product_name}</h3>
          {productData.quantity && <p><b>Quantité :</b> {productData.quantity}</p>}
          {productData.image_small_url && (
            <img src={productData.image_small_url} alt={productData.product_name} style={{ width: '100px', marginTop: '10px' }} />
          )}
        </div>
      )}

      {spoonacularResult && (
        <div className="spoonacular-info">
          <h4>Suggestion Spoonacular</h4>
          <p>{spoonacularResult.title}</p>
          <img src={spoonacularResult.image} alt={spoonacularResult.title} style={{ width: '120px', borderRadius: '10px', marginTop: '10px' }} />
        </div>
      )}

      {history.length > 0 && (
        <div className="history">
          <h3>Historique</h3>
          <div className="filters">
            <button onClick={() => setFilterRange('all')}>📦 Tout</button>
            <button onClick={() => setFilterRange('today')}>📅 Aujourd’hui</button>
            <button onClick={() => setFilterRange('week')}>📈 Cette semaine</button>
          </div>
          <button onClick={clearHistory} className="clear-history">Effacer l'historique 🗑️</button>
          <div className="export-buttons">
            <button onClick={exportAsJSON}>⬇️ Exporter JSON</button>
            <button onClick={exportAsCSV}>⬇️ Exporter CSV</button>
          </div>
          <ul>
            {filteredHistory.map((item, index) => (
              <li key={index}>
                <div className="history-item">
                  <img src={item.image} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong><br />
                    {item.calories} kcal<br />
                    <small>{new Date(item.date).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}</small>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="calory-chart">
            <h3>📊 Calories par produit</h3>
            <Bar
              data={{
                labels: filteredHistory.map(item => item.name),
                datasets: [{
                  label: 'Calories',
                  data: filteredHistory.map(item => item.calories),
                  backgroundColor: '#00b894'
                }]
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true },
                  x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 } }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
