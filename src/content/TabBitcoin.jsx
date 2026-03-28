export default function TabBitcoin() {
        return (
                <div>
                        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-64 h-64">
                                {[...Array(9)].map((_, index) => (
                                        <div 
                                                key={index}
                                                className="bg-lime-300 border-2 border-lime-500 rounded-lg hover:bg-lime-400 transition-colors duration-200"
                                        />
                                ))}
                        </div>
                        <div className="text-lime-300">Hi!</div>
                </div>
        )
}