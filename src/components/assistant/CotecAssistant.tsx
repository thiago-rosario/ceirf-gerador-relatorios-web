import assistantCotec from "@/assets/assistenteCotec.png"

export function CotecAssistant() {
  return (
    <div className="pointer-events-none fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 sm:right-6 sm:bottom-6">
      <div className="size-12 overflow-hidden rounded-full border border-primary/20 bg-card shadow-sm sm:size-14">
        <img src={assistantCotec} alt="Mascote institucional da CEIRF" className="size-full origin-[50%_20%] scale-[2.2] object-cover" />
      </div>
    </div>
  )
}
