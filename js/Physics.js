// Physics constants (normalized for simulation)
// G = 1, c = 1
// Mass is in Solar Masses (approx)
// Distance in "units" (approx 1000km per unit)

export class PhysicsEngine {
    constructor() {
        this.c = 1.0;
        this.G = 1.0;
    }

    calculateSchwarzschildRadius(mass) {
        // Rs = 2GM/c^2
        // For consistency with shader visuals where G=1, c=1: Rs = 2 * Mass
        return 2.0 * mass;
    }

    calculateTimeDilation(r, Rs) {
        // t' = t * sqrt(1 - Rs/r)
        // If r < Rs, it's imaginary (inside black hole)
        if (r <= Rs) return Infinity;
        return 1.0 / Math.sqrt(1.0 - Rs / r);
    }

    calculateTidalForce(mass, r) {
        // Tidal acceleration a_t approx 2GM/r^3 * length
        // We just return a factor proportional to M/r^3
        if (r === 0) return Infinity;
        return (mass) / (r * r * r);
    }
    
    getGravity(mass, r) {
        // g = GM/r^2
        if (r === 0) return Infinity;
        return (this.G * mass) / (r * r);
    }
}
