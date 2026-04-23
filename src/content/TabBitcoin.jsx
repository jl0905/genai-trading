export default function TabBitcoin() {
        return (
                <div>
                        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-64 h-64">
                                {[...Array(9)].map((_, index) => (
                                        <div 
                                                key={index}
                                                style={{ backgroundColor: 'var(--chart-up)', borderColor: 'var(--accent)' }}
                                                className="border-2 rounded-lg opacity-80 hover:opacity-100 transition-opacity duration-200"
                                        />
                                ))}
                        </div>
                        <div style={{ color: 'var(--chart-up)' }} className="mt-4 font-bold text-xl">Hi!</div>
                </div>
        )
}