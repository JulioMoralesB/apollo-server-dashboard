import ServiceCard from "./components/ServiceCard"

const services = [
  { name: "Minecraft Server", status: "online" },
  { name: "Discord Bot", status : "offline" },
  { name: "Free Games Notifier", status: "online" },
]

function App() {
  return (
    <div className="dashboard">
      <h1>Apollo Server Dashboard</h1>
      <div className="services-grid">
        {services.map((service, index) => (
          <ServiceCard key={index} name={service.name} status={service.status} />
        ))}
      </div>
    </div>
  )
}

export default App