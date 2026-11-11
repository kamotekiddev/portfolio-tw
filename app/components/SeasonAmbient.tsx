// Decorative seasonal particles. Server-rendered empty spans; globals.css picks
// the effect from <html data-season> and hides the layer without a season or
// when reduced motion is preferred.
const PARTICLE_COUNT = 18;

export default function SeasonAmbient() {
   return (
      <div className="season-ambient" aria-hidden="true">
         {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
            <span key={index} />
         ))}
      </div>
   );
}
