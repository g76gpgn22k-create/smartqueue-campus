async function load(){
  const {data,error}=await supabase.from('offices').select('*')
  if(error){demoData();return}

  offices=data||[]
  render()

  const {data:q}=await supabase
    .from('queue_tickets')
    .select('id')
    .in('status',['waiting','called','serving'])

  document.querySelector('#liveCount').textContent =
    `${q?.length||0} clients currently queued`

  supabase.channel('queue-live')
    .on('postgres_changes',{
      event:'*',
      schema:'public',
      table:'queue_tickets'
    },()=>load())
    .subscribe()
}
