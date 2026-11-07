const steps = [
  { title: "Choose a service", text: "Hanapin ang kailangan mong i-report o i-request. Check its requirements before you begin." },
  { title: "Send the details", text: "Provide the information and documents needed for that service." },
  { title: "Follow the progress", text: "Use your reference ID or account to read recorded updates and the next action." },
];
export function WorkflowSection() {
  return <section id="how-it-works" aria-labelledby="public-workflow-title" className="public-section public-workflow"><div className="public-container public-workflow-layout"><div><h2 id="public-workflow-title">From concern to next step.</h2><p>Malinaw ang simula. Nasusubaybayan ang mga update.</p></div><ol>{steps.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></div></section>;
}
