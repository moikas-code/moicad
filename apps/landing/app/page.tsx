import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Modern CAD for
              <span className="text-blue-400"> JavaScript</span> Developers
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Write parametric 3D models in JavaScript or OpenSCAD.
              10-20x faster evaluation with guaranteed manifold output.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/demo"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-lg"
              >
                🚀 Try Live Demo
              </Link>
              <Link
                href="/docs"
                className="px-8 py-4 border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white font-semibold rounded-lg transition-colors text-lg"
              >
                📚 Documentation
              </Link>
              <Link
                href="https://github.com/moikas-code/moicad"
                className="px-8 py-4 border-2 border-gray-400 text-gray-300 hover:border-gray-200 hover:text-white font-semibold rounded-lg transition-colors text-lg"
              >
                💻 GitHub
              </Link>
            </div>
          </div>
        </div>

        {/* Background Animation */}
        <div className="  inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-purple-500 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-cyan-500 rounded-full blur-xl animate-pulse delay-2000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-black bg-opacity-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            Why Choose moicad?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-slate-800 bg-opacity-50 p-6 rounded-xl border border-slate-700">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Lightning Fast
              </h3>
              <p className="text-gray-300">
                JavaScript evaluation is 10-20x faster than OpenSCAD parsing.
                Instant feedback for rapid prototyping.
              </p>
            </div>

            <div className="bg-slate-800 bg-opacity-50 p-6 rounded-xl border border-slate-700">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Type Safe
              </h3>
              <p className="text-gray-300">
                Full TypeScript support with autocomplete.
                Catch errors at development time, not runtime.
              </p>
            </div>

            <div className="bg-slate-800 bg-opacity-50 p-6 rounded-xl border border-slate-700">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                OpenSCAD Compatible
              </h3>
              <p className="text-gray-300">
                98-99% OpenSCAD language compatibility.
                Migrate existing projects with minimal changes.
              </p>
            </div>

            <div className="bg-slate-800 bg-opacity-50 p-6 rounded-xl border border-slate-700">
              <div className="text-4xl mb-4">🛠️</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Fluent API
              </h3>
              <p className="text-gray-300">
                Chainable methods with the Shape class.
                Write readable, maintainable code.
              </p>
            </div>

            <div className="bg-slate-800 bg-opacity-50 p-6 rounded-xl border border-slate-700">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                NPM Package
              </h3>
              <p className="text-gray-300">
                Install as npm package. Works in browser and Node.js.
                Build CAD tools into your apps.
              </p>
            </div>

            <div className="bg-slate-800 bg-opacity-50 p-6 rounded-xl border border-slate-700">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Guaranteed Manifold
              </h3>
              <p className="text-gray-300">
                Built on manifold-3d engine. No topology errors,
                clean boolean operations every time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Code Comparison */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            See the Difference
          </h2>

          <div className="sm:grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-blue-400 mb-4">
                JavaScript (Modern)
              </h3>
              <pre className="bg-slate-900 p-3 sm:p-4 lg:p-5 rounded-lg overflow-x-auto code-scroll">
                <code className="text-sm sm:text-base lg:text-lg text-gray-300 leading-relaxed">
{`// Parametric Bolt Class
class Bolt {
  constructor(length, diameter) {
    this.length = length;
    this.diameter = diameter;
  }

  build() {
    return Shape.cylinder(this.length, this.diameter / 2)
      .union(Shape.sphere(this.diameter * 0.9)
        .translate([0, 0, this.length]))
      .color('silver');
  }
}

export default new Bolt(20, 6).build();`}
                </code>
              </pre>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-green-400 mb-4">
                OpenSCAD (Classic)
              </h3>
              <pre className="bg-slate-900 p-3 sm:p-4 lg:p-5 rounded-lg overflow-x-auto code-scroll">
                <code className="text-sm sm:text-base lg:text-lg text-gray-300 leading-relaxed">
{`module bolt(length=20, diameter=6) {
  cylinder(h=length, r=diameter/2);
  translate([0, 0, length])
    sphere(r=diameter * 0.9, $fn=6);
}

bolt();`}
                </code>
              </pre>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-300 text-lg">
              JavaScript gives you classes, async/await, npm packages, and modern tooling.
              <br />
              OpenSCAD provides familiarity for existing CAD users.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-black bg-opacity-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            Built for Real Work
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">🖨️</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                3D Printing
              </h3>
              <p className="text-gray-300">
                Design functional parts with parametric models.
                Export directly to STL for slicing.
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Mechanical Design
              </h3>
              <p className="text-gray-300">
                Create precise mechanical assemblies.
                Test fits and clearances before manufacturing.
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Prototyping
              </h3>
              <p className="text-gray-300">
                Rapid iteration with instant preview.
                Share models as JavaScript modules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-8">
            Ready to Transform Your CAD Workflow?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join developers who are building the next generation of parametric design tools.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-xl"
            >
              🚀 Start Building Now
            </Link>
            <Link
              href="https://github.com/moikas-code/moicad"
              className="px-10 py-4 border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white font-bold rounded-lg transition-colors text-xl"
            >
              📦 Install SDK
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
