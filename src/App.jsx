import ServiceCard from "./components/ServiceCard"
import { useEffect,useState } from "react"

function App() {

   const [services, setServices] = useState([])
   const [loading, setLoading] = useState(true)
   const [error , setError] = useState(null)

useEffect(()=>{
  const getData = async ()=>{

    try{

      const res = await fetch('/services',{
        headers :{
              "x-api-key": import.meta.env.VITE_API_KEY

        }
      });
     
    if (!res.ok) {
  if (res.status === 401) {
    throw new Error("Unauthorized - Invalid API key");
  }
  throw new Error("Failed to fetch services");
}
       const data = await res.json()
      setServices(data)

    }catch(err){
      setError(err.message)
      console.log('Error are ' ,err)
    }finally{
      setLoading(false)
    }

  }
  getData()
},[])


  return (
    <div className="dashboard">
      <h1>Apollo Server Dashboard</h1>
      {loading && (<h1>
        Loading.....
      </h1>)}
      {error && (<h1>
        Error: {error}
      </h1>)}
      <div className="services-grid">
        {services.map((service, index) => (
          <ServiceCard key={index} {...service} />
        ))}
      </div>
    </div>
  )
}

export default App