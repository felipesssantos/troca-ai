import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

export const useTour = (tourKey: string, steps: any[]) => {
    const { user } = useAuthStore()

    useEffect(() => {
        if (!user || steps.length === 0) return

        const checkAndStartTour = async () => {
            // 1. Fetch current progress
            const { data, error } = await supabase
                .from('profiles')
                .select('tutorial_progress')
                .eq('id', user.id)
                .single()

            if (error) return

            // Check if this specific tour key has been seen
            const progress = data?.tutorial_progress || {}
            // @ts-ignore
            if (progress[tourKey]) return

            // 2. Define Driver
            const driverObj = driver({
                showProgress: true,
                animate: true,
                doneBtnText: 'Concluir',
                nextBtnText: 'Próximo',
                prevBtnText: 'Anterior',
                allowClose: false,
                steps: steps,
                onDestroyed: async () => {
                    // 3. Mark as seen
                    const newProgress = { ...progress, [tourKey]: true }

                    await supabase
                        .from('profiles')
                        .update({ tutorial_progress: newProgress })
                        .eq('id', user.id)
                }
            })

            driverObj.drive()
        }

        // Small delay to ensure UI is mounted
        setTimeout(() => checkAndStartTour(), 1500)

    }, [user, tourKey])
}
