import AffordabilityCalculator from './components/AffordabilityCalculator'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4 md:p-8 text-slate-200">
      <div className="max-w-[1600px] w-full mx-auto">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-400 text-center mb-10 tracking-tight drop-shadow-sm">
          House Purchase Affordability Calculator
        </h1>
        <AffordabilityCalculator />
      </div>
    </div>
  )
}

export default App
